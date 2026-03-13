import { useBooking } from '../context/BookingContext';

const SEAT_COLORS = {
  standard: { available: 'bg-slate-100 border-slate-300 text-slate-900 font-bold hover:bg-blue-100 hover:border-blue-400', selected: 'bg-blue-600 border-blue-600 text-white', booked: 'bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed' },
  vip: { available: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-200', selected: 'bg-amber-500 border-amber-500 text-white', booked: 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed' },
  couple: { available: 'bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-200', selected: 'bg-pink-500 border-pink-500 text-white', booked: 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed' },
};

export default function SeatGrid({ seats, readOnly = false }) {
  const { bookingData, toggleSeat, toggleCouplePair, seatPrice } = useBooking();

  // Group seats by row
  const rows = {};
  seats.forEach(seat => {
    if (!rows[seat.row_label]) rows[seat.row_label] = [];
    rows[seat.row_label].push(seat);
  });

  return (
    <div>
      {/* Screen */}
      <div className="mb-8 text-center">
        <div className="inline-block w-3/4 h-3 bg-gradient-to-b from-blue-200 to-blue-100 rounded-t-full mx-auto"></div>
        <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">Screen</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-slate-100 border-slate-300 inline-block"></span> Standard ${bookingData.showtime?.price_standard}</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-amber-50 border-amber-300 inline-block"></span> VIP ${bookingData.showtime?.price_vip}</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-pink-50 border-pink-300 inline-block"></span> Couple ${bookingData.showtime?.price_couple} <span className="text-pink-400">(pair)</span></span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-blue-600 border-blue-600 inline-block"></span> Selected</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-slate-200 border-slate-200 inline-block"></span> Booked</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto flex justify-center">
        <div className="min-w-max">
          {Object.entries(rows).map(([rowLabel, rowSeats]) => {
            // Find couple pair for this row (all seats with seat_type === 'couple')
            const couplePair = rowSeats.filter(s => s.seat_type === 'couple');
            const isPairFullyBooked = couplePair.length > 0 && couplePair.every(s => s.is_booked);

            return (
              <div key={rowLabel} className="flex items-center gap-1 mb-1">
                <span className="w-6 text-xs text-slate-400 font-medium text-right mr-1">{rowLabel}</span>
                {rowSeats.map(seat => {
                  const isSelected = !readOnly && bookingData.selectedSeats.some(s => s.id === seat.id);
                  const isBooked = seat.is_booked;
                  // For couple seats: disabled if either seat in the pair is booked
                  const isCoupleDisabled = seat.seat_type === 'couple' && (isPairFullyBooked || couplePair.some(s => s.is_booked));
                  const colors = SEAT_COLORS[seat.seat_type] || SEAT_COLORS.standard;
                  const cls = (isBooked || isCoupleDisabled) ? colors.booked : isSelected ? colors.selected : colors.available;

                  const handleClick = () => {
                    if (readOnly || isBooked || isCoupleDisabled) return;
                    if (seat.seat_type === 'couple') {
                      toggleCouplePair(couplePair);
                    } else {
                      toggleSeat(seat);
                    }
                  };

                  return (
                    <button
                      key={seat.id}
                      disabled={isBooked || isCoupleDisabled || readOnly}
                      onClick={handleClick}
                      title={
                        seat.seat_type === 'couple'
                          ? `${rowLabel}${seat.seat_number} — Couple seat (books pair) — $${seatPrice(seat)} each`
                          : `${rowLabel}${seat.seat_number} — ${seat.seat_type} — $${seatPrice(seat)}`
                      }
                      className={`seat-btn w-8 h-8 text-xs font-medium rounded border ${cls} flex items-center justify-center`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
                <span className="w-6 text-xs text-slate-400 font-medium ml-1">{rowLabel}</span>
              </div>
            );
          })}
          {/* Seat numbers at bottom */}
          <div className="flex items-center gap-1 mt-1 ml-7">
            {Object.values(rows)[0]?.map(s => (
              <span key={s.id} className="w-8 text-xs text-slate-300 text-center">{s.seat_number}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
