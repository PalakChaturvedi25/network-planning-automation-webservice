export interface FlightApiResponse {
  content?: any[];
  data?: any[];
}

export interface FlightVersionData {
  flightSsimKey: string;
  baseFile: string;
  airline: string;
  flightNumber: number;
  opSuffix: string;
  departureStation: string;
  arrivalStation: string;
  std: string; // Scheduled departure time
  sta: string; // Scheduled arrival time
  aircraftEquipment: string;
  aircraftConfiguration: string;
  date: string;
  legSequenceNumber: string;
  serviceType: string;
  departureTerminal: string;
  arrivalTerminal: string;
  electronicTicket: string;
  codeShareDuplicateLeg: string | null;
  effectiveDate: string;
  expiryDate: string;
  status: string | null;
  remarks: string | null;
  isLatest: boolean;
  modifiedAt: string | null;
}

// Existing interfaces
export interface FlightApiResponse {
  content?: any[];
  data?: any[];
  [key: string]: any;
}

export interface ProcessedFlightData {
  date: string;
  flightNumber: string;
  departureStation: string;
  arrivalStation: string;
  std: string;
  sta: string;
  departureTerminal: string;
  arrivalTerminal: string;
  aircraftEquipment: string;
  aircraftConfiguration: string;
  codeShareDuplicateLeg: string;
}

export interface FlightVersionApiResponse {
  content?: FlightVersionFullData[];
  data?: FlightVersionFullData[];
}

export interface FlightVersionFullData {
  date: string;
    flightNumber: string;
    departureStation: string;
    arrivalStation: string;
    std: string;
    sta: string;
    departureTerminal: string;
    arrivalTerminal: string;
    aircraftEquipment: string;
    aircraftConfiguration: string;
    codeShareDuplicateLeg: string;
}

export interface FlightVersionResponse {
  date: string;
    flightNumber: string;
    departureStation: string;
    arrivalStation: string;
    std: string;
    sta: string;
    departureTerminal: string;
    arrivalTerminal: string;
    aircraftEquipment: string;
    aircraftConfiguration: string;
    codeShareDuplicateLeg: string;
}