import { parseFlexibleDate, calculateDaysDifference, formatToDDMMYYYY } from './date';

// Types for billing calculations
export interface BillingInputs {
  checkInDate: string;
  checkOutDate: string;
  roomNumber: string;
  guest: any;
  checkoutDetails: {
    finalAmount?: number;
    additionalCharges?: number;
    laundryCharges?: number;
    halfDayCharges?: number;
    actualCheckOutDate: string;
  };
  roomBasePrice?: number;
}

export interface BillingBreakdown {
  daysDiff: number;
  pricePerDay: number;
  extraBedCharges: number;
  roomRent: number;
  totalRoomCharges: number;
  additionalCharges: number;
  laundryCharges: number;
  halfDayCharges: number;
  isComplimentary: boolean;
  
  // Tax breakdowns
  roomRentTaxableValue: number;
  roomRentCgst: number;
  roomRentSgst: number;
  extraBedTaxableValue: number;
  extraBedCgst: number;
  extraBedSgst: number;
  foodingTaxableValue: number;
  foodingCgst: number;
  foodingSgst: number;
  laundryTaxableValue: number;
  laundryCgst: number;
  laundrySgst: number;
  halfDayTaxableValue: number;
  halfDayCgst: number;
  halfDaySgst: number;
  
  // Totals
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalAmount: number;
  totalAmountDisplay: number;
}

// Convert number to Indian words for amount in words
export const numberToIndianWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const scales = ['', 'THOUSAND', 'LAKH', 'CRORE'];

  if (num === 0) return 'ZERO';
  if (num < 0) return 'NEGATIVE ' + numberToIndianWords(-num);

  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  };

  let result = '';
  let scaleIndex = 0;

  while (num > 0) {
    const group = num % 1000;
    if (group !== 0) {
      const groupWords = convertHundreds(group);
      if (scaleIndex > 0) {
        result = groupWords + ' ' + scales[scaleIndex] + ' ' + result;
      } else {
        result = groupWords;
      }
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  return result.trim() || 'ZERO';
};

// Main billing calculation function
export const calculateBill = (inputs: BillingInputs): BillingBreakdown => {
  const { checkInDate, checkOutDate, guest, checkoutDetails, roomBasePrice = 0 } = inputs;

  // Calculate days difference
  const checkInDateObj = parseFlexibleDate(checkInDate);
  const checkOutDateObj = parseFlexibleDate(checkOutDate);
  let daysDiff = calculateDaysDifference(checkInDateObj, checkOutDateObj);
  if (daysDiff < 1) daysDiff = 1; // Ensure minimum 1 day

  // Get per-day amount from checkout form (preferred source)
  const perDayFromCheckout = Math.max(0,
    (checkoutDetails.finalAmount || 0)
    - (checkoutDetails.additionalCharges || 0)
    - (checkoutDetails.laundryCharges || 0)
    - (checkoutDetails.halfDayCharges || 0)
  );

  // Establish pricePerDay and extraBedCharges
  let pricePerDay = 0;
  let extraBedCharges = 0;

  if (perDayFromCheckout > 0) {
    // Use the exact per-day room rent (including extra bed) from checkout form
    pricePerDay = perDayFromCheckout;
    extraBedCharges = 0; // already included in per-day
  } else {
    // Fallback to room base price or derived rate from guest totals
    const fallbackExtra = guest.extraBeds ? guest.extraBeds.reduce((sum: number, bed: any) => sum + bed.charge, 0) : 0;
    const derivedPerDay = Math.round(Math.max(0, (guest.totalAmount - fallbackExtra)) / Math.max(1, daysDiff));
    pricePerDay = roomBasePrice > 0 ? roomBasePrice : derivedPerDay;
    extraBedCharges = fallbackExtra;
  }

  // Check if complimentary stay
  const isComplimentary = (guest.complimentary === true) || 
    (String(guest.complimentary).toLowerCase() === 'true');

  // Apply complimentary logic: only room rent and extra bed are waived (add-ons remain billable)
  if (isComplimentary) {
    pricePerDay = 0;
    extraBedCharges = 0;
  }

  // Calculate room charges
  const roomRent = pricePerDay * daysDiff;
  const totalRoomCharges = roomRent + extraBedCharges;

  // Normalize optional charges to numbers
  const additionalCharges = Number(checkoutDetails.additionalCharges) || 0;
  const laundryCharges = Number(checkoutDetails.laundryCharges) || 0;
  const halfDayCharges = Number(checkoutDetails.halfDayCharges) || 0;

  // Calculate tax breakdown for room rent (5% GST: 2.5% CGST + 2.5% SGST)
  const roomRentTaxableValue = roomRent / 1.05;
  const roomRentCgst = roomRentTaxableValue * 0.025;
  const roomRentSgst = roomRentTaxableValue * 0.025;

  // Calculate tax breakdown for extra bed charges (5% GST: 2.5% CGST + 2.5% SGST)
  const extraBedTaxableValue = extraBedCharges / 1.05;
  const extraBedCgst = extraBedTaxableValue * 0.025;
  const extraBedSgst = extraBedTaxableValue * 0.025;

  // Calculate tax breakdown for fooding charges (5% GST: 2.5% CGST + 2.5% SGST)
  const foodingTaxableValue = additionalCharges > 0 ? additionalCharges / 1.05 : 0;
  const foodingCgst = foodingTaxableValue * 0.025;
  const foodingSgst = foodingTaxableValue * 0.025;

  // Calculate tax breakdown for laundry charges (5% GST: 2.5% CGST + 2.5% SGST)
  const laundryTaxableValue = laundryCharges > 0 ? laundryCharges / 1.05 : 0;
  const laundryCgst = laundryTaxableValue * 0.025;
  const laundrySgst = laundryTaxableValue * 0.025;

  // Half-day charges are treated as room rent (5% GST)
  const halfDayTaxableValue = halfDayCharges > 0 ? halfDayCharges / 1.05 : 0;
  const halfDayCgst = halfDayTaxableValue * 0.025;
  const halfDaySgst = halfDayTaxableValue * 0.025;

  // Calculate totals
  const totalTaxableValue = roomRentTaxableValue + extraBedTaxableValue + foodingTaxableValue + laundryTaxableValue + halfDayTaxableValue;
  const totalCgst = roomRentCgst + extraBedCgst + foodingCgst + laundryCgst + halfDayCgst;
  const totalSgst = roomRentSgst + extraBedSgst + foodingSgst + laundrySgst + halfDaySgst;

  // Calculate total amount (sum of all individual row totals)
  const totalAmount = (Number(roomRent) || 0) + (Number(extraBedCharges) || 0) + additionalCharges + laundryCharges + halfDayCharges;
  const totalAmountDisplay = Math.round(totalAmount);

  return {
    daysDiff,
    pricePerDay,
    extraBedCharges,
    roomRent,
    totalRoomCharges,
    additionalCharges,
    laundryCharges,
    halfDayCharges,
    isComplimentary,
    
    // Tax breakdowns
    roomRentTaxableValue,
    roomRentCgst,
    roomRentSgst,
    extraBedTaxableValue,
    extraBedCgst,
    extraBedSgst,
    foodingTaxableValue,
    foodingCgst,
    foodingSgst,
    laundryTaxableValue,
    laundryCgst,
    laundrySgst,
    halfDayTaxableValue,
    halfDayCgst,
    halfDaySgst,
    
    // Totals
    totalTaxableValue,
    totalCgst,
    totalSgst,
    totalAmount,
    totalAmountDisplay
  };
};

// Helper function to get display-safe values for complimentary stays
export const getDisplaySafeValues = (breakdown: BillingBreakdown) => {
  if (!breakdown.isComplimentary) {
    return {
      displayPricePerDay: breakdown.pricePerDay,
      displayRoomRent: breakdown.roomRent,
      displayRoomRentTaxableValue: breakdown.roomRentTaxableValue,
      displayRoomRentCgst: breakdown.roomRentCgst,
      displayRoomRentSgst: breakdown.roomRentSgst
    };
  }

  return {
    displayPricePerDay: 0,
    displayRoomRent: 0,
    displayRoomRentTaxableValue: 0,
    displayRoomRentCgst: 0,
    displayRoomRentSgst: 0
  };
};

// Helper function to format dates for bills
export const formatBillDates = (checkInDate: string, checkOutDate: string) => {
  return {
    formattedArrivalDate: formatToDDMMYYYY(checkInDate),
    formattedDepartureDate: formatToDDMMYYYY(checkOutDate)
  };
};
