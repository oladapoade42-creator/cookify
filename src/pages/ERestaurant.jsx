import { useEffect, useState, useRef } from "react";
import { Plus, MapPin, X, ShoppingBag, Loader2, ChefHat } from "lucide-react";
import { supabase } from "../supabase";

const ORDER_STAGES = ["pending", "preparing", "out_for_delivery", "delivered"];
const STAGE_LABELS = {
  pending: "Pending",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export default function ERestaurant({ authUser, isSeller, openListingId }) {
  const [listings, setListings] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [activeListing, setActiveListing] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState({ title: "", price: "", description: "", image: "" });
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadListings();
    if (authUser) {
      loadMyOrders();
      if (isSeller) loadIncomingOrders();
    }
  }, [authUser, isSeller]);

  useEffect(() => {
    if (openListingId && listings.length > 0) {
      const found = listings.find((l) => l.id === openListingId);
      if (found) openOrderModal(found);
    }
  }, [openListingId, listings]);

  async function loadListings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setListings(data);
    } catch (e) {
      // food_listings table not set up yet
    }
    setLoading(false);
  }

  async function loadMyOrders() {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*, food_listings(title, image)")
        .eq("buyer_id", authUser.id)
        .order("created_at", { ascending: false });
      if (data) setMyOrders(data);
    } catch (e) {}
  }

  async function loadIncomingOrders() {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*, food_listings(title)")
        .eq("seller_id", authUser.id)
        .order("created_at", { ascending: false });
      if (data) setIncomingOrders(data);
    } catch (e) {}
  }

  async function openOrderModal(listing) {
    setActiveListing(listing);
    setDistanceInfo(null);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, seller_bank_name, seller_account_name, seller_account_number, seller_address, delivery_radius_km, seller_lat, seller_lng")
        .eq("user_id", listing.seller_id)
        .maybeSingle();
      setSellerProfile(data);

      if (data?.seller_lat && data?.seller_lng && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const distanceKm = haversineKm(pos.coords.latitude, pos.coords.longitude, data.seller_lat, data.seller_lng);
            setDistanceInfo({
              distanceKm: distanceKm.toFixed(1),
              inRange: distanceKm <= (data.delivery_radius_km || 5),
            });
          },
          () => setDistanceInfo(null)
        );
      }
    } catch (e) {
      setSellerProfile(null);
    }
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  async function placeOrder() {
    if (!authUser) {
      alert("Sign in to place an order.");
      return;
    }
    try {
      const { error } = await supabase.from("orders").insert({
        listing_id: activeListing.id,
        buyer_id: authUser.id,
        seller_id: activeListing.seller_id,
        status: "pending",
      });
      if (error) throw error;
      setNotice("Order placed! Pay the seller using the details below, then track status here.");
      loadMyOrders();
    } catch (e) {
      setNotice("Couldn't place the order — the orders table may not be set up yet.");
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      await supabase.from("orders").update({ status }).eq("id", orderId);
      loadIncomingOrders();
    } catch (e) {}
  }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, image: reader.result }));
    reader.readAsDataURL(file);
  }

  async function postListing() {
    if (!draft.title.trim() || !draft.price) return;
    setPosting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData?.session?.user?.email || "";
      await supabase.from("food_listings").insert({
        seller_id: authUser.id,
        seller_name: email,
        title: draft.title.trim(),
        price: parseFloat(draft.price),
        description: draft.description.trim(),
        image: draft.image || null,
      });
      setDraft({ title: "", price: "", description: "", image: "" });
      setShowPostForm(false);
      loadListings();
    } catch (e) {
      alert("Couldn't post — the food_listings table may not be set up yet.");
    }
    setPosting(false);
  }

  const directionsUrl = (address) =>
    address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  return (
    <div className="flex-1 bg-black p-5 overflow-y-auto text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">E-Restaurant</h1>
          <p className="text-gray-400 mt-1">Order real food from Cookify Pro+ sellers.</p>
        </div>
        {isSeller && (
          <button
            onClick={() => setShowPostForm(true)}
            className="rounded-full bg-white text-black p-3"
            aria-label="Post food"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {!isSeller && (
        <p className="mt-3 text-xs text-gray-500">
          Only Cookify Pro+ subscribers can sell food here — anyone (even free users) can order.
        </p>
      )}

      {loading ? (
        <div className="mt-10 flex justify-center text-gray-500"><Loader2 className="animate-spin" /></div>
      ) : listings.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">No food listed yet — check back soon.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-3xl border border-white/10 bg-zinc-900/80 overflow-hidden">
              {listing.image ? (
                <img src={listing.image} alt={listing.title} className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 w-full bg-white/5 flex items-center justify-center"><ChefHat className="text-white/30" /></div>
              )}
              <div className="p-3">
                <p className="font-bold text-sm truncate">{listing.title}</p>
                <p className="text-xs text-gray-500 truncate">{listing.seller_name}</p>
                <p className="mt-1 font-black">${Number(listing.price).toFixed(2)}</p>
                <button
                  onClick={() => openOrderModal(listing)}
                  className="mt-2 w-full rounded-xl bg-white text-black py-2 text-xs font-bold uppercase tracking-wide"
                >
                  Order Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {myOrders.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-black mb-3">Your Orders</h2>
          <div className="space-y-3">
            {myOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{o.food_listings?.title || "Order"}</p>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">{STAGE_LABELS[o.status]}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {ORDER_STAGES.map((stage, i) => (
                    <div
                      key={stage}
                      className={`h-1.5 flex-1 rounded-full ${ORDER_STAGES.indexOf(o.status) >= i ? "bg-white" : "bg-white/10"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSeller && incomingOrders.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-black mb-3">Incoming Orders</h2>
          <div className="space-y-3">
            {incomingOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <p className="font-bold">{o.food_listings?.title || "Order"}</p>
                <select
                  value={o.status}
                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                  className="mt-2 w-full rounded-xl bg-black border border-white/15 p-2 text-sm"
                >
                  {ORDER_STAGES.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order modal */}
      {activeListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-zinc-950 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">{activeListing.title}</h3>
              <button onClick={() => { setActiveListing(null); setNotice(""); setDistanceInfo(null); }} className="rounded-full border border-white/10 bg-white/10 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400">{activeListing.description}</p>
            <p className="mt-2 text-2xl font-black">${Number(activeListing.price).toFixed(2)}</p>

            {notice && <p className="mt-3 text-sm text-emerald-300">{notice}</p>}

            <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200">
              Cookify does not process or verify this payment — you're paying the seller's account
              directly. Only send money to sellers you trust, and confirm the order details before paying.
            </div>

            {distanceInfo && (
              <div className={`mt-3 rounded-2xl border p-3 text-sm text-center ${
                distanceInfo.inRange ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"
              }`}>
                {distanceInfo.inRange
                  ? `You're ${distanceInfo.distanceKm}km away — within this seller's delivery range.`
                  : `You're ${distanceInfo.distanceKm}km away — outside this seller's ${sellerProfile?.delivery_radius_km || 5}km delivery range.`}
              </div>
            )}

            {sellerProfile?.seller_account_number ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Pay Seller Directly</p>
                <p>Bank: {sellerProfile.seller_bank_name}</p>
                <p>Account Name: {sellerProfile.seller_account_name}</p>
                <p>Account Number: {sellerProfile.seller_account_number}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">This seller hasn't added payment details yet.</p>
            )}

            {sellerProfile?.seller_address && (
              <a
                href={directionsUrl(sellerProfile.seller_address)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/15 py-3 text-sm font-bold"
              >
                <MapPin className="h-4 w-4" /> Get Directions
              </a>
            )}

            <button
              onClick={placeOrder}
              className="mt-4 w-full rounded-2xl bg-white text-black py-3 font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" /> Confirm Order
            </button>
          </div>
        </div>
      )}

      {/* Post food modal (Pro+ sellers only) */}
      {showPostForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-[420px] rounded-[28px] border border-white/10 bg-zinc-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Post Food</h3>
              <button onClick={() => setShowPostForm(false)} className="rounded-full border border-white/10 bg-white/10 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 rounded-2xl border border-dashed border-white/20 flex items-center justify-center overflow-hidden"
            >
              {draft.image ? <img src={draft.image} className="h-full w-full object-cover" /> : <span className="text-sm text-gray-500">Tap to add a photo</span>}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Dish name"
              className="mt-3 w-full rounded-xl bg-black border border-white/15 p-3 text-sm"
            />
            <input
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              placeholder="Price (USD)"
              type="number"
              className="mt-3 w-full rounded-xl bg-black border border-white/15 p-3 text-sm"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Description"
              className="mt-3 w-full h-20 resize-none rounded-xl bg-black border border-white/15 p-3 text-sm"
            />

            <button
              onClick={postListing}
              disabled={posting}
              className="mt-4 w-full rounded-2xl bg-white text-black py-3 font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
