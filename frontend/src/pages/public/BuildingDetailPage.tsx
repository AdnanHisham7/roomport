import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { MapPin, Layers3, DoorOpen, Wifi, Star, ChevronLeft, Send, ChevronRight, Images } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Textarea } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { FloorSlab } from '@/components/building/FloorSlab';
import { useGetPublicBuildingDetailQuery, useGetPublicBuildingUnitsQuery } from '@/store/api/publicApi';
import { useCreateInquiryMutation } from '@/store/api/inquiryApi';
import { PageLoader } from '@/components/ui/Avatar';
import { formatCurrency } from '@/utils/format';
import type { PublicUnit } from '@/types/platform';

// ── Image slider with auto-advance + dot navigation ──────────────────────────
function ImageSlider({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length]);

  const go = (i: number) => {
    setIdx(i);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  if (!images.length) return null;
  if (images.length === 1) return (
    <div className="mb-6 overflow-hidden rounded-2xl">
      <img src={images[0]} alt={alt} className="h-64 w-full object-cover sm:h-80" />
    </div>
  );

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt={`${alt} ${idx + 1}`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
          className="h-64 w-full object-cover sm:h-80"
        />
      </AnimatePresence>

      {/* Prev/Next arrows */}
      <button onClick={() => go((idx - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/40 p-1.5 text-white backdrop-blur-sm hover:bg-ink/60">
        <ChevronLeft className="size-4" />
      </button>
      <button onClick={() => go((idx + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/40 p-1.5 text-white backdrop-blur-sm hover:bg-ink/60">
        <ChevronRight className="size-4" />
      </button>

      {/* Dot navigation */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`size-2 rounded-full transition-all duration-200 ${i === idx ? 'bg-white scale-125' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Room detail card shown when a room tile is clicked ────────────────────────
function RoomCard({ unit, buildingSlug, onClose }: { unit: PublicUnit; buildingSlug: string; onClose: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = unit.images ?? [];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
      <Card padding="md" className="border-crimson-200">
        <p className="mb-0.5 text-xs font-medium text-crimson-500">Selected room</p>
        <p className="font-mono text-base font-semibold text-ink">{unit.unitNumber}</p>
        {unit.activeOffer ? (
          <p className="text-sm text-ink-soft">
            {unit.bedrooms}BR / {unit.bathrooms}BA ·{' '}
            <span className="font-semibold text-crimson-600">{formatCurrency(unit.effectiveRent)}/mo</span>{' '}
            <span className="text-ink-faint line-through">{formatCurrency(unit.rentAmount)}</span>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">{unit.bedrooms}BR / {unit.bathrooms}BA · {formatCurrency(unit.rentAmount)}/mo</p>
        )}

        {/* Room description */}
        {unit.description && <p className="mt-2 text-xs text-ink-faint">{unit.description}</p>}

        {/* Room amenities */}
        {unit.amenities?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {unit.amenities.map(a => <span key={a} className="rounded-full bg-paper-dim px-2 py-0.5 text-[10px] text-ink-soft">{a}</span>)}
          </div>
        ) : null}

        {/* Room images mini-slider */}
        {images.length > 0 && (
          <div className="relative mt-3 overflow-hidden rounded-lg">
            <img src={images[imgIdx]} alt={unit.unitNumber} className="h-28 w-full object-cover" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-ink/40 p-0.5 text-white"><ChevronLeft className="size-3" /></button>
                <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-ink/40 p-0.5 text-white"><ChevronRight className="size-3" /></button>
                <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
                  {images.map((_, i) => <span key={i} className={`block size-1.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />)}
                </div>
              </>
            )}
            <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-ink/50 px-1.5 py-0.5 text-[9px] text-white">
              <Images className="size-2.5" /> {images.length}
            </span>
          </div>
        )}

        <Link
          to={`/listings/${buildingSlug}/rooms/${unit._id}`}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-crimson-600 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-crimson-700"
        >
          View &amp; book this room
        </Link>
        <button onClick={onClose} className="mt-2 text-xs text-ink-faint hover:text-ink">Clear selection</button>
      </Card>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BuildingDetailPage() {
  // Route param is now a slug OR objectId
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useGetPublicBuildingDetailQuery(slug!, { skip: !slug });
  const { data: unitsData }  = useGetPublicBuildingUnitsQuery(slug!, { skip: !slug });
  const [createInquiry, { isLoading: sending }] = useCreateInquiryMutation();
  const [selectedUnit, setSelectedUnit] = useState<PublicUnit | null>(null);
  const { register, handleSubmit, reset } = useForm<{ name: string; email: string; phone: string; message: string }>();

  if (isLoading) return <PageLoader />;
  if (!data?.data) return <div className="p-8 text-center text-ink-soft">Listing not found.</div>;
  const b = data.data;
  const units = unitsData?.data ?? [];

  const unitsByFloor = new Map<string, PublicUnit[]>();
  for (const u of units) {
    const arr = unitsByFloor.get(u.floorNumber) ?? [];
    arr.push(u);
    unitsByFloor.set(u.floorNumber, arr);
  }
  const sortedFloors = [...b.floors].sort((a, c) => c.floorNumber - a.floorNumber);

  const onInquire = async (values: { name: string; email: string; phone: string; message: string }) => {
    try {
      await createInquiry({ buildingId: b._id, ...values }).unwrap();
      toast.success("Thanks! We've sent your inquiry to the property manager.");
      reset();
    } catch (err: any) {
      toast.error(err?.data?.message ?? 'Could not send inquiry.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/listings" className="mb-5 flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" /> Back to listings
      </Link>

      {/* Image slider (auto-advance + dots) */}
      {b.images?.length ? <ImageSlider images={b.images} alt={b.name} /> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-3xl font-semibold text-ink">{b.name}</h1>
              {b.isFeatured && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600"><Star className="size-3.5" /> Featured</span>}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft"><MapPin className="size-4" />{b.location.address}, {b.location.city}, {b.location.state}</p>
            <div className="mt-3 flex gap-4 text-sm text-ink-soft">
              <span className="flex items-center gap-1.5"><Layers3 className="size-4 text-crimson-400" /> {b.totalFloors} floors</span>
              <span className="flex items-center gap-1.5"><DoorOpen className="size-4 text-crimson-400" /> {b.availableUnitsCount} available</span>
              {b.lift && <span className="flex items-center gap-1.5"><Wifi className="size-4 text-crimson-400" /> Lift</span>}
            </div>
            {b.minRent !== null && (
              <p className="mt-3 font-display text-xl font-semibold text-crimson-600">
                From {formatCurrency(b.minRent)} <span className="text-sm font-normal text-ink-soft">/ month</span>
              </p>
            )}
            {b.description && <p className="mt-4 text-sm leading-relaxed text-ink-soft">{b.description}</p>}
          </div>

          {/* Floor plan — rooms are clickable to show detail in sidebar */}
          <div>
            <h2 className="mb-2 font-display text-lg font-semibold text-ink">Floor plan</h2>
            <p className="mb-3 text-xs text-ink-faint">Click any room to see details and book it.</p>
            <div className="flex flex-col-reverse gap-3">
              <AnimatePresence initial={false}>
                {sortedFloors.map((floor, i) => (
                  <FloorSlab
                    key={floor._id}
                    floor={{ _id: floor._id, buildingId: b._id, floorNumber: floor.floorNumber, name: floor.name, totalUnits: floor.totalUnits, status: floor.status as any }}
                    units={unitsByFloor.get(floor.floorNumber.toString()) ?? []}
                    index={i}
                    editable={false}
                    onRoomClick={u => setSelectedUnit(u as PublicUnit)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <AnimatePresence>
            {selectedUnit && (
              <RoomCard key={selectedUnit._id} unit={selectedUnit} buildingSlug={b.slug ?? b._id} onClose={() => setSelectedUnit(null)} />
            )}
          </AnimatePresence>

          {!selectedUnit && (
            <Card padding="lg">
              <h3 className="mb-4 font-display text-base font-semibold text-ink">Enquire about this property</h3>
              <form onSubmit={handleSubmit(onInquire)} className="flex flex-col gap-3">
                <Input placeholder="Your name"        {...register('name',  { required: true })} />
                <Input type="email" placeholder="your@email.com" {...register('email', { required: true })} />
                <Input placeholder="Phone (optional)" {...register('phone')} />
                <Textarea placeholder="Tell us what you're looking for…" {...register('message')} />
                <Button type="submit" loading={sending} icon={<Send className="size-4" />} className="justify-center">Send inquiry</Button>
              </form>
            </Card>
          )}

          {b.amenities?.length ? (
            <Card padding="md">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {b.amenities.map(a => <span key={a} className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink-soft">{a}</span>)}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
