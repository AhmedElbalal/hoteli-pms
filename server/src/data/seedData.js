export const seedData = {
  "property": { "id": "P-001", "name": "HOTELI Demo Hotel", "rooms": 24, "currency": "CAD", "roomTaxRate": 0.05 },
  "users": [
    { "id": "U-1", "name": "Admin User", "email": "admin@hoteli.com", "passwordHash": "$2a$10$Wqf2FYdbxMmY/cJ.RJ49NepMmp11m.wVo96L54tw1Tt4zFiKzo0iq", "role": "ADMIN" },
    { "id": "U-2", "name": "Front Desk Agent", "email": "frontdesk@hoteli.com", "passwordHash": "$2a$10$Wqf2FYdbxMmY/cJ.RJ49NepMmp11m.wVo96L54tw1Tt4zFiKzo0iq", "role": "FRONT_DESK" },
    { "id": "U-3", "name": "Night Auditor", "email": "auditor@hoteli.com", "passwordHash": "$2a$10$Wqf2FYdbxMmY/cJ.RJ49NepMmp11m.wVo96L54tw1Tt4zFiKzo0iq", "role": "NIGHT_AUDITOR" },
    { "id": "U-4", "name": "General Manager", "email": "manager@hoteli.com", "passwordHash": "$2a$10$Wqf2FYdbxMmY/cJ.RJ49NepMmp11m.wVo96L54tw1Tt4zFiKzo0iq", "role": "MANAGER" }
  ],
  "rooms": [
    { "id": "RM-201", "number": "201", "type": "Suite", "status": "Maintenance", "housekeeping": "Dirty", "rateBase": 229, "notes": "" },
    { "id": "RM-202", "number": "202", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-203", "number": "203", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-204", "number": "204", "type": "King", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 189, "notes": "" },
    { "id": "RM-205", "number": "205", "type": "Queen", "status": "Green Stay", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-206", "number": "206", "type": "Suite", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 229, "notes": "" },
    { "id": "RM-207", "number": "207", "type": "King", "status": "Vacant Dirty", "housekeeping": "Dirty", "rateBase": 189, "notes": "" },
    { "id": "RM-208", "number": "208", "type": "Queen", "status": "Maintenance", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-209", "number": "209", "type": "Queen", "status": "Green Stay", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-210", "number": "210", "type": "King", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 189, "notes": "" },
    { "id": "RM-211", "number": "211", "type": "Suite", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 229, "notes": "" },
    { "id": "RM-212", "number": "212", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-213", "number": "213", "type": "King", "status": "Vacant Dirty", "housekeeping": "Dirty", "rateBase": 189, "notes": "" },
    { "id": "RM-214", "number": "214", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-215", "number": "215", "type": "Queen", "status": "Maintenance", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-216", "number": "216", "type": "Suite", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 229, "notes": "" },
    { "id": "RM-217", "number": "217", "type": "Queen", "status": "Green Stay", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-218", "number": "218", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-219", "number": "219", "type": "King", "status": "Vacant Dirty", "housekeeping": "Dirty", "rateBase": 189, "notes": "" },
    { "id": "RM-220", "number": "220", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-221", "number": "221", "type": "Suite", "status": "Green Stay", "housekeeping": "Clean", "rateBase": 229, "notes": "" },
    { "id": "RM-222", "number": "222", "type": "King", "status": "Maintenance", "housekeeping": "Clean", "rateBase": 189, "notes": "" },
    { "id": "RM-223", "number": "223", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" },
    { "id": "RM-224", "number": "224", "type": "Queen", "status": "Vacant Ready", "housekeeping": "Clean", "rateBase": 159, "notes": "" }
  ],
  "reservations": [
    { "id": "R-3471241782", "guestName": "Aranshi Kumar", "email": "aranshi@example.com", "roomNumber": "207", "status": "ARRIVAL", "source": "Prepaid", "checkIn": "2026-05-29", "checkOut": "2026-05-31", "adults": 1, "rate": 189, "balance": 0, "notes": "Prepaid reservation." },
    { "id": "R-423313925", "guestName": "Jennifer Tessier Blust", "email": "jennifer@example.com", "roomNumber": "", "status": "UNASSIGNED", "source": "Corporate Coca-Cola", "checkIn": "2026-05-30", "checkOut": "2026-05-31", "adults": 1, "rate": 165, "balance": 165, "notes": "Corporate weekday rate." },
    { "id": "R-3465975079", "guestName": "Tianxi Pu", "email": "tianxi@example.com", "roomNumber": "", "status": "UNASSIGNED", "source": "CTrip VCC", "checkIn": "2026-05-30", "checkOut": "2026-05-31", "adults": 2, "rate": 211.33, "balance": 21.33, "notes": "VCC difference." },
    { "id": "R-3443094066", "guestName": "Gurpreet Singh", "email": "gurpreet@example.com", "roomNumber": "210", "status": "CHECKED_OUT", "source": "OTA", "checkIn": "2026-05-29", "checkOut": "2026-05-30", "adults": 1, "rate": 149, "balance": 0, "notes": "Early checkout." }
  ],
  "folios": [
    {
      "id": "F-R-3471241782", "reservationId": "R-3471241782", "guestName": "Aranshi Kumar", "status": "OPEN", "items": [
        { "id": "FI-1", "type": "CHARGE", "code": "ROOM", "description": "Room charge", "amount": 189, "date": "2026-05-29" },
        { "id": "FI-1A", "type": "CHARGE", "code": "TPS_ROOM", "description": "TPS / GST on room", "amount": 9.45, "date": "2026-05-29" },
        { "id": "FI-1B", "type": "CHARGE", "code": "TVQ_ROOM", "description": "TVQ / QST on room", "amount": 18.85, "date": "2026-05-29" },
        { "id": "FI-1C", "type": "CHARGE", "code": "LODGING_TAX", "description": "Taxe d'hébergement / Lodging tax", "amount": 6.62, "date": "2026-05-29" },
        { "id": "FI-1D", "type": "CHARGE", "code": "PARKING", "description": "Parking", "amount": 30, "date": "2026-05-29" },
        { "id": "FI-1E", "type": "CHARGE", "code": "TPS_PARKING", "description": "TPS / GST on parking", "amount": 1.5, "date": "2026-05-29" },
        { "id": "FI-1F", "type": "CHARGE", "code": "TVQ_PARKING", "description": "TVQ / QST on parking", "amount": 2.99, "date": "2026-05-29" },
        { "id": "FI-2", "type": "PAYMENT", "code": "PREPAID", "description": "Prepaid OTA payment", "amount": -258.41, "date": "2026-05-29" }
      ]
    },
    {
      "id": "F-R-3465975079", "reservationId": "R-3465975079", "guestName": "Tianxi Pu", "status": "OPEN", "items": [
        { "id": "FI-3", "type": "CHARGE", "code": "ROOM", "description": "Room charge", "amount": 211.33, "date": "2026-05-30" },
        { "id": "FI-3A", "type": "CHARGE", "code": "TPS_ROOM", "description": "TPS / GST on room", "amount": 10.57, "date": "2026-05-30" },
        { "id": "FI-3B", "type": "CHARGE", "code": "TVQ_ROOM", "description": "TVQ / QST on room", "amount": 21.08, "date": "2026-05-30" },
        { "id": "FI-3C", "type": "CHARGE", "code": "LODGING_TAX", "description": "Taxe d'hébergement / Lodging tax", "amount": 7.4, "date": "2026-05-30" },
        { "id": "FI-4", "type": "PAYMENT", "code": "VCC", "description": "Virtual card partial payment", "amount": -228.06, "date": "2026-05-30" }
      ]
    }
  ],
  "houseAccounts": [
    { "id": "HA-1001", "name": "Prepaid OTA Clearing", "status": "OPEN", "owner": "Accounting", "items": [{ "id": "HAI-1", "type": "CHARGE", "description": "VCC short payment", "amount": 21.33, "date": "2026-05-30" }] },
    { "id": "HA-1002", "name": "Adjustment Log", "status": "OPEN", "owner": "Night Audit", "items": [] },
    {
      "id": "HA-1003", "name": "Banquet Revenue", "status": "OPEN", "owner": "Sales", "items": [
        { "id": "HAI-2", "type": "CHARGE", "description": "Banquet revenue", "amount": 2600, "date": "2026-05-30" },
        { "id": "HAI-3", "type": "PAYMENT", "description": "Banquet payment", "amount": -2600, "date": "2026-05-30" }
      ]
    }
  ],
  "nightAudits": [],
  "supportTickets": [],
  "auditLogs": []
};
