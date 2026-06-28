/* AtriaERP — Seed data
 * Creates a realistic multi-company / multi-project dataset on first run.
 */
(function (global) {
  "use strict";

  function d(offsetDays) {
    var dt = new Date(); dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  }

  function buildSeed() {
    var companies = [
      { id: "co_atria", name: "Atria Realty Pvt Ltd", gstin: "27AAACA1234A1Z5", pan: "AAACA1234A", city: "Mumbai", state: "Maharashtra", createdAt: d(-400) },
      { id: "co_skyline", name: "Skyline Infra LLP", gstin: "27AABFS5678B1Z3", pan: "AABFS5678B", city: "Vasai", state: "Maharashtra", createdAt: d(-300) },
      { id: "co_green", name: "Greenfield Estates Pvt Ltd", gstin: "27AAGCG9012C1Z1", pan: "AAGCG9012C", city: "Thane", state: "Maharashtra", createdAt: d(-200) }
    ];

    var projects = [
      { id: "pr_heights", companyId: "co_atria", name: "Atria Heights", location: "Borivali West, Mumbai", reraNo: "P51800012345", createdAt: d(-380) },
      { id: "pr_grand", companyId: "co_atria", name: "Atria Grand", location: "Goregaon East, Mumbai", reraNo: "P51800023456", createdAt: d(-250) },
      { id: "pr_sky", companyId: "co_skyline", name: "Skyline Residency", location: "Nalasopara East", reraNo: "P99000034567", createdAt: d(-280) },
      { id: "pr_meadows", companyId: "co_green", name: "Green Meadows", location: "Ghodbunder Road, Thane", reraNo: "P51700045678", createdAt: d(-180) }
    ];

    var records = {
      leads: [
        { id: "ld1", companyId: "co_atria", projectId: "pr_heights", name: "Suresh Mehta", phone: "98200 11223", email: "suresh.m@gmail.com", source: "99acres", interestType: "2 BHK", budget: 14500000, owner: "Priya Shah", stage: "Site Visit", nextFollowUp: d(2), remarks: "Wants high floor, sea view. Comparing with competitor.", createdAt: d(-12) },
        { id: "ld2", companyId: "co_atria", projectId: "pr_heights", name: "Anita Desai", phone: "99300 44556", email: "anita.d@yahoo.com", source: "Referral", interestType: "3 BHK", budget: 21000000, owner: "Rohan Kapoor", stage: "Negotiation", nextFollowUp: d(1), remarks: "Negotiating on parking + 2% discount.", createdAt: d(-20) },
        { id: "ld3", companyId: "co_atria", projectId: "pr_heights", name: "Imran Shaikh", phone: "98700 77889", source: "WhatsApp", interestType: "1 BHK", budget: 9500000, owner: "Priya Shah", stage: "New", nextFollowUp: d(0), remarks: "Enquired via WhatsApp blast.", createdAt: d(-2) },
        { id: "ld4", companyId: "co_atria", projectId: "pr_grand", name: "Deepak Joshi", phone: "97690 22110", source: "Walk-in", interestType: "2 BHK", budget: 13000000, owner: "Rohan Kapoor", stage: "Booked", nextFollowUp: d(-3), remarks: "Booked unit B-1104. Token received.", createdAt: d(-30) },
        { id: "ld5", companyId: "co_skyline", projectId: "pr_sky", name: "Farah Khan", phone: "90040 55667", source: "MagicBricks", interestType: "1 BHK", budget: 5500000, owner: "Sunil More", stage: "Contacted", nextFollowUp: d(3), remarks: "First-time buyer, needs home loan help.", createdAt: d(-6) },
        { id: "ld6", companyId: "co_green", projectId: "pr_meadows", name: "Vikram Rao", phone: "98201 99887", source: "Broker", interestType: "3 BHK", budget: 18500000, owner: "Neha Iyer", stage: "Lost", nextFollowUp: d(-10), remarks: "Went with competitor pricing.", createdAt: d(-40) }
      ],
      units: [
        { id: "u1", companyId: "co_atria", projectId: "pr_heights", unitNo: "A-1001", tower: "A", floor: 10, type: "2 BHK", carpetArea: 680, builtUpArea: 920, ratePerSqft: 21000, price: 14280000, facing: "Sea-facing", status: "Available", createdAt: d(-100) },
        { id: "u2", companyId: "co_atria", projectId: "pr_heights", unitNo: "A-1002", tower: "A", floor: 10, type: "3 BHK", carpetArea: 980, builtUpArea: 1320, ratePerSqft: 21500, price: 21070000, facing: "Garden", status: "Booked", createdAt: d(-100) },
        { id: "u3", companyId: "co_atria", projectId: "pr_heights", unitNo: "A-0501", tower: "A", floor: 5, type: "1 BHK", carpetArea: 450, builtUpArea: 610, ratePerSqft: 20000, price: 9000000, facing: "East", status: "Registered", createdAt: d(-100) },
        { id: "u4", companyId: "co_atria", projectId: "pr_heights", unitNo: "B-1104", tower: "B", floor: 11, type: "2 BHK", carpetArea: 700, builtUpArea: 945, ratePerSqft: 21000, price: 14700000, facing: "West", status: "Sold", createdAt: d(-100) },
        { id: "u5", companyId: "co_atria", projectId: "pr_grand", unitNo: "G-0703", tower: "G", floor: 7, type: "2 BHK", carpetArea: 660, builtUpArea: 890, ratePerSqft: 19500, price: 12870000, facing: "North", status: "Available", createdAt: d(-80) },
        { id: "u6", companyId: "co_skyline", projectId: "pr_sky", unitNo: "S-0202", tower: "S", floor: 2, type: "1 BHK", carpetArea: 420, builtUpArea: 560, ratePerSqft: 11000, price: 4620000, facing: "East", status: "Available", createdAt: d(-90) },
        { id: "u7", companyId: "co_green", projectId: "pr_meadows", unitNo: "M-1501", tower: "M", floor: 15, type: "3 BHK", carpetArea: 1050, builtUpArea: 1410, ratePerSqft: 16500, price: 17325000, facing: "Garden", status: "Available", createdAt: d(-70) }
      ],
      payments: [
        { id: "p1", companyId: "co_atria", projectId: "pr_heights", customer: "Deepak Joshi", unit: "B-1104", milestone: "Booking Token", amount: 500000, dueDate: d(-25), receivedDate: d(-24), mode: "UPI", status: "Paid", createdAt: d(-25) },
        { id: "p2", companyId: "co_atria", projectId: "pr_heights", customer: "Deepak Joshi", unit: "B-1104", milestone: "On Agreement (20%)", amount: 2940000, dueDate: d(-5), mode: "RTGS", status: "Overdue", createdAt: d(-20) },
        { id: "p3", companyId: "co_atria", projectId: "pr_heights", customer: "Anita Desai", unit: "A-1002", milestone: "Plinth Slab", amount: 2107000, dueDate: d(8), mode: "Home Loan", status: "Due", createdAt: d(-10) },
        { id: "p4", companyId: "co_atria", projectId: "pr_heights", customer: "R. Krishnan", unit: "A-0501", milestone: "Final + Registration", amount: 1800000, dueDate: d(-2), receivedDate: d(-1), mode: "Cheque", status: "Paid", createdAt: d(-15) },
        { id: "p5", companyId: "co_skyline", projectId: "pr_sky", customer: "Farah Khan", unit: "S-0202", milestone: "Booking", amount: 250000, dueDate: d(4), mode: "NEFT", status: "Due", createdAt: d(-3) }
      ],
      agreements: [
        { id: "ag1", companyId: "co_atria", projectId: "pr_heights", agreementNo: "ATR/AGR/2026/041", customer: "R. Krishnan", unit: "A-0501", value: 9000000, agreementDate: d(-60), stampDuty: 540000, registrationStatus: "Registered", registrationNo: "BRL-7-04521-2026", createdAt: d(-60) },
        { id: "ag2", companyId: "co_atria", projectId: "pr_heights", agreementNo: "ATR/AGR/2026/052", customer: "Deepak Joshi", unit: "B-1104", value: 14700000, agreementDate: d(-18), stampDuty: 882000, registrationStatus: "Pending", createdAt: d(-18) }
      ],
      letters: [
        { id: "lt1", companyId: "co_atria", projectId: "pr_heights", type: "Bank NOC", recipient: "HDFC Bank Ltd", unit: "A-0501", refNo: "ATR/NOC/118", issueDate: d(-40), status: "Issued", body: "NOC for mortgage of unit A-0501 in favour of HDFC Bank.", createdAt: d(-40) },
        { id: "lt2", companyId: "co_atria", projectId: "pr_heights", type: "Demand Letter", recipient: "Deepak Joshi", unit: "B-1104", refNo: "ATR/DM/231", issueDate: d(-6), status: "Issued", body: "Demand for 'On Agreement' milestone — 20%.", createdAt: d(-6) },
        { id: "lt3", companyId: "co_atria", projectId: "pr_heights", type: "Parking Allotment", recipient: "R. Krishnan", unit: "A-0501", refNo: "ATR/PK/074", issueDate: d(-35), status: "Issued", body: "Allotment of stilt parking P-22.", createdAt: d(-35) }
      ],
      properties: [
        { id: "pp1", companyId: "co_atria", name: "Atria Heights Land", location: "Borivali West", surveyNo: "CTS 451/2", totalArea: 48000, reraNo: "P51800012345", titleHolder: "Atria Realty Pvt Ltd", status: "Active", createdAt: d(-380) },
        { id: "pp2", companyId: "co_atria", name: "Atria Grand Land", location: "Goregaon East", surveyNo: "CTS 88/A", totalArea: 36000, reraNo: "P51800023456", titleHolder: "Atria Realty Pvt Ltd", status: "Active", createdAt: d(-250) },
        { id: "pp3", companyId: "co_green", name: "Green Meadows Plot", location: "Ghodbunder Road", surveyNo: "Gut 142", totalArea: 72000, reraNo: "P51700045678", titleHolder: "Greenfield Estates Pvt Ltd", status: "Planning", createdAt: d(-180) }
      ],
      plans: [
        { id: "pl1", companyId: "co_atria", projectId: "pr_heights", title: "Tower A — Typical Floor", category: "Architectural", revision: "R3", approvedBy: "BMC", date: d(-200), status: "Approved", createdAt: d(-200) },
        { id: "pl2", companyId: "co_atria", projectId: "pr_heights", title: "RCC Column Layout", category: "Structural", revision: "R1", approvedBy: "Structural Consultant", date: d(-150), status: "Approved", createdAt: d(-150) }
      ],
      rentals: [
        { id: "rn1", companyId: "co_atria", tenant: "Cafe Coffee Day", unit: "Shop G-04", monthlyRent: 185000, deposit: 1110000, leaseStart: d(-300), leaseEnd: d(60), escalation: 5, status: "Notice Period", createdAt: d(-300) },
        { id: "rn2", companyId: "co_atria", tenant: "Dr. Kulkarni Clinic", unit: "Office 201", monthlyRent: 65000, deposit: 390000, leaseStart: d(-200), leaseEnd: d(500), escalation: 5, status: "Active", createdAt: d(-200) }
      ],
      creditors: [
        { id: "cr1", companyId: "co_atria", name: "UltraTech Cement Ltd", gstin: "27AAACL1234M1Z2", outstanding: 1850000, ageDays: 45, lastBill: d(-45), createdAt: d(-45) },
        { id: "cr2", companyId: "co_atria", name: "Jindal Steel & Power", gstin: "27AAACJ5678N1Z9", outstanding: 3200000, ageDays: 60, lastBill: d(-60), createdAt: d(-60) },
        { id: "cr3", companyId: "co_atria", name: "Asian Paints Ltd", gstin: "27AAACA1111P1Z4", outstanding: 420000, ageDays: 15, lastBill: d(-15), createdAt: d(-15) }
      ],
      debtors: [
        { id: "db1", companyId: "co_atria", name: "Deepak Joshi (B-1104)", gstin: "", outstanding: 2940000, ageDays: 5, lastBill: d(-5), createdAt: d(-5) },
        { id: "db2", companyId: "co_atria", name: "Anita Desai (A-1002)", gstin: "", outstanding: 2107000, ageDays: 2, lastBill: d(-2), createdAt: d(-2) }
      ],
      gst: [
        { id: "g1", companyId: "co_atria", period: "May-2026", type: "Output", taxable: 12500000, igst: 0, cgst: 375000, sgst: 375000, returnStatus: "Filed", createdAt: d(-30) },
        { id: "g2", companyId: "co_atria", period: "Jun-2026", type: "Output", taxable: 9800000, igst: 0, cgst: 294000, sgst: 294000, returnStatus: "Pending", createdAt: d(-2) },
        { id: "g3", companyId: "co_atria", period: "Jun-2026", type: "Input", taxable: 5050000, igst: 0, cgst: 151500, sgst: 151500, returnStatus: "Pending", createdAt: d(-2) }
      ],
      tds: [
        { id: "td1", companyId: "co_atria", deductee: "Sai Constructions", pan: "ABCFS1234K", section: "194C", amountPaid: 2500000, rate: 2, tdsAmount: 50000, challanStatus: "Deposited", createdAt: d(-20) },
        { id: "td2", companyId: "co_atria", deductee: "Arch Design Studio", pan: "AADPD5678L", section: "194J", amountPaid: 800000, rate: 10, tdsAmount: 80000, challanStatus: "Pending", createdAt: d(-5) }
      ],
      vendors: [
        { id: "vn1", companyId: "co_atria", name: "UltraTech Cement Ltd", category: "Cement", contact: "Mr. Pawar", phone: "98190 12345", email: "sales@ultratech.com", gstin: "27AAACL1234M1Z2", pan: "AAACL1234M", outstanding: 1850000, rating: "A", createdAt: d(-200) },
        { id: "vn2", companyId: "co_atria", name: "Sai Constructions", category: "Labour Contractor", contact: "Mr. Sai", phone: "99670 88990", gstin: "27ABCFS1234K1Z6", pan: "ABCFS1234K", outstanding: 950000, rating: "B", createdAt: d(-180) },
        { id: "vn3", companyId: "co_atria", name: "Jindal Steel & Power", category: "Steel", contact: "Ms. Rane", phone: "98200 33445", gstin: "27AAACJ5678N1Z9", pan: "AAACJ5678N", outstanding: 3200000, rating: "A", createdAt: d(-220) }
      ],
      purchases: [
        { id: "po1", companyId: "co_atria", projectId: "pr_heights", poNo: "ATR/PO/2026/311", vendor: "UltraTech Cement Ltd", item: "OPC 53 Grade Cement", qty: 2000, unitName: "bags", amount: 760000, poDate: d(-12), status: "Received", createdAt: d(-12) },
        { id: "po2", companyId: "co_atria", projectId: "pr_heights", poNo: "ATR/PO/2026/318", vendor: "Jindal Steel & Power", item: "TMT Bars Fe-500D", qty: 45, unitName: "MT", amount: 2925000, poDate: d(-4), status: "Ordered", createdAt: d(-4) }
      ],
      workorders: [
        { id: "wo1", companyId: "co_atria", projectId: "pr_heights", woNo: "ATR/WO/2026/22", contractor: "Sai Constructions", scope: "RCC work Tower A (Plinth to 10th)", value: 18500000, startDate: d(-90), endDate: d(40), progress: 65, status: "In Progress", createdAt: d(-90) },
        { id: "wo2", companyId: "co_atria", projectId: "pr_heights", woNo: "ATR/WO/2026/28", contractor: "Perfect Plumbers", scope: "Plumbing & drainage Tower A", value: 4200000, startDate: d(-30), endDate: d(120), progress: 20, status: "In Progress", createdAt: d(-30) },
        { id: "wo3", companyId: "co_atria", projectId: "pr_heights", woNo: "ATR/WO/2026/15", contractor: "BrightSpark Electricals", scope: "Electrical conduiting", value: 3100000, startDate: d(-120), endDate: d(-10), progress: 100, status: "Completed", createdAt: d(-120) }
      ],
      schedule: [
        { id: "sc1", companyId: "co_atria", projectId: "pr_heights", task: "10th Slab Casting — Tower A", contractor: "Sai Constructions", phone: "99670 88990", start: d(-5), end: d(2), reminder: "Sent", status: "In Progress", createdAt: d(-5) },
        { id: "sc2", companyId: "co_atria", projectId: "pr_heights", task: "Plumbing rough-in 8th floor", contractor: "Perfect Plumbers", phone: "98330 22119", start: d(1), end: d(10), reminder: "Scheduled", status: "Pending", createdAt: d(-1) },
        { id: "sc3", companyId: "co_atria", projectId: "pr_heights", task: "Lift shaft handover", contractor: "Otis India", phone: "98201 77665", start: d(-12), end: d(-2), reminder: "Overdue", status: "Delayed", createdAt: d(-12) }
      ],
      construction: [
        { id: "cn1", companyId: "co_atria", projectId: "pr_heights", block: "Tower A", stage: "Slabs", progress: 65, updatedOn: d(-2), engineer: "Eng. Patil", remarks: "10th slab in progress, on schedule.", createdAt: d(-2) },
        { id: "cn2", companyId: "co_atria", projectId: "pr_heights", block: "Tower B", stage: "Brickwork", progress: 80, updatedOn: d(-3), engineer: "Eng. Shaikh", remarks: "Internal blockwork ongoing.", createdAt: d(-3) }
      ],
      liaisoning: [
        { id: "li1", companyId: "co_atria", projectId: "pr_heights", approval: "Plinth Checking Certificate", authority: "BMC", fileNo: "BMC/BP/2026/4451", appliedDate: d(-50), consultant: "Sharma Associates", status: "Approved", remarks: "Received.", createdAt: d(-50) },
        { id: "li2", companyId: "co_atria", projectId: "pr_heights", approval: "Fire NOC (Provisional)", authority: "Fire NOC", fileNo: "MFB/2026/887", appliedDate: d(-20), consultant: "Safe Fire Consultants", status: "Query Raised", remarks: "Refuge area query — revised plan submitted.", createdAt: d(-20) },
        { id: "li3", companyId: "co_skyline", projectId: "pr_sky", approval: "Commencement Certificate", authority: "VVCMC", fileNo: "VVCMC/TP/2026/210", appliedDate: d(-15), consultant: "Patil Liaison", status: "Under Scrutiny", remarks: "Awaiting site inspection.", createdAt: d(-15) }
      ],
      legaldocs: [
        { id: "lg1", companyId: "co_atria", title: "Title Deed — CTS 451/2", docType: "Title Deed", refNo: "TD/451/2", party: "Atria Realty Pvt Ltd", date: d(-380), status: "Verified", createdAt: d(-380) },
        { id: "lg2", companyId: "co_atria", title: "Search Report 30 Years", docType: "Search Report", refNo: "SR/2025/77", party: "Adv. Mehta", date: d(-370), status: "Verified", createdAt: d(-370) },
        { id: "lg3", companyId: "co_green", title: "7/12 Extract Gut 142", docType: "7/12 Extract", refNo: "712/142", party: "Greenfield Estates", date: d(-160), status: "Pending", createdAt: d(-160) }
      ],
      land: [
        { id: "la1", companyId: "co_green", parcel: "Ghodbunder Parcel 1", village: "Ovala, Thane", surveyNo: "Gut 142", area: 4.2, owner: "Greenfield Estates Pvt Ltd", stage: "Due Diligence", litigation: "None", reminderDate: d(7), remarks: "NA conversion pending.", createdAt: d(-160) },
        { id: "la2", companyId: "co_green", parcel: "Ghodbunder Parcel 2", village: "Ovala, Thane", surveyNo: "Gut 145", area: 2.8, owner: "Private (under negotiation)", stage: "Litigation", litigation: "Pending", reminderDate: d(3), remarks: "Boundary dispute — next hearing soon.", createdAt: d(-140) }
      ],
      payroll: [
        { id: "pay1", companyId: "co_atria", name: "Priya Shah", designation: "Sales Manager", department: "Sales", ctc: 95000, deductions: 12000, netPay: 83000, status: "Processed", createdAt: d(-2) },
        { id: "pay2", companyId: "co_atria", name: "Eng. Patil", designation: "Site Engineer", department: "Site/Projects", ctc: 78000, deductions: 9000, netPay: 69000, status: "Processed", createdAt: d(-2) },
        { id: "pay3", companyId: "co_atria", name: "Ramesh Gupta", designation: "Accountant", department: "Accounts", ctc: 62000, deductions: 7500, netPay: 54500, status: "Pending", createdAt: d(-2) }
      ],
      reimbursements: [
        { id: "rb1", companyId: "co_atria", claimant: "Eng. Patil", category: "Site Expense", amount: 8500, date: d(-3), mode: "Petty Cash", status: "Approved", remarks: "Tools & consumables.", createdAt: d(-3) },
        { id: "rb2", companyId: "co_atria", claimant: "Priya Shah", category: "Travel", amount: 3200, date: d(-1), mode: "Bank", status: "Pending", remarks: "Client site visits.", createdAt: d(-1) }
      ]
    };

    return {
      meta: {
        appName: "AtriaERP",
        seededAt: new Date().toISOString(),
        context: { companyId: "co_atria", projectId: "pr_heights" },
        integrations: {
          tally: { connected: false, lastSync: null, host: "localhost:9000" },
          axis: { connected: false, lastSync: null },
          whatsapp: { connected: false },
          email: { connected: false }
        }
      },
      companies: companies,
      projects: projects,
      records: records
    };
  }

  global.Seed = { buildSeed: buildSeed };
})(window);
