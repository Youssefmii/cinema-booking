import { createContext, useContext, useState } from 'react';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [bookingData, setBookingData] = useState({
    showtime: null,
    selectedSeats: [],
    selectedSnacks: [],
  });

  const setShowtime = (showtime) => setBookingData(prev => ({ ...prev, showtime, selectedSeats: [], selectedSnacks: [] }));
  const toggleSeat = (seat) => setBookingData(prev => {
    const exists = prev.selectedSeats.find(s => s.id === seat.id);
    return { ...prev, selectedSeats: exists ? prev.selectedSeats.filter(s => s.id !== seat.id) : [...prev.selectedSeats, seat] };
  });

  // For couple seats — always select/deselect the whole pair together
  const toggleCouplePair = (pairSeats) => setBookingData(prev => {
    const anySelected = pairSeats.some(s => prev.selectedSeats.find(sel => sel.id === s.id));
    if (anySelected) {
      // Deselect both
      return { ...prev, selectedSeats: prev.selectedSeats.filter(s => !pairSeats.find(p => p.id === s.id)) };
    } else {
      // Select both
      return { ...prev, selectedSeats: [...prev.selectedSeats, ...pairSeats] };
    }
  });
  const setSnacks = (snacks) => setBookingData(prev => ({ ...prev, selectedSnacks: snacks }));
  const clearBooking = () => setBookingData({ showtime: null, selectedSeats: [], selectedSnacks: [] });

  const seatPrice = (seat) => {
    const st = bookingData.showtime;
    if (!st) return 0;
    if (seat.seat_type === 'vip') return st.price_vip;
    if (seat.seat_type === 'couple') return st.price_couple;
    return st.price_standard;
  };

  const total = () => {
    const seatTotal = bookingData.selectedSeats.reduce((sum, s) => sum + seatPrice(s), 0);
    const snackTotal = bookingData.selectedSnacks.reduce((sum, s) => sum + s.price * s.quantity, 0);
    return seatTotal + snackTotal;
  };

  return (
    <BookingContext.Provider value={{ bookingData, setShowtime, toggleSeat, toggleCouplePair, setSnacks, clearBooking, seatPrice, total }}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => useContext(BookingContext);
