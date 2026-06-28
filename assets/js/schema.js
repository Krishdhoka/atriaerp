/* AtriaERP — Schema / module definitions
 * Each entity declares: title, icon, scope, fields (for forms), columns (for tables).
 * Field types: text, textarea, number, money, date, select, tags, email, phone, percent.
 * The generic List/Form views render entirely from these definitions.
 */
(function (global) {
  "use strict";

  // Reusable option sets
  var LEAD_STAGES = ["New", "Contacted", "Site Visit", "Negotiation", "Booked", "Lost"];
  var LEAD_SOURCES = ["Website", "WhatsApp", "Walk-in", "Referral", "99acres", "MagicBricks", "Broker", "Hoarding", "Newspaper"];
  var UNIT_STATUS = ["Available", "Blocked", "Booked", "Registered", "Sold", "Mortgaged"];
  var UNIT_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Shop", "Office", "Parking", "Plot"];
  var PAY_STATUS = ["Due", "Partially Paid", "Paid", "Overdue"];
  var WO_STATUS = ["Draft", "Issued", "In Progress", "On Hold", "Completed", "Closed"];
  var CONSTRUCTION_STAGES = ["Land", "Excavation", "Plinth", "Slabs", "Brickwork", "Plaster", "Finishing", "OC Received", "Handover"];
  var LAND_STAGES = ["Identified", "Under Negotiation", "Agreement", "Due Diligence", "Registered", "Mutation", "Litigation", "Development"];
  var APPROVAL_BODIES = ["BMC", "VVCMC", "MMRDA", "CIDCA", "Town Planning", "Fire NOC", "Environment", "Airport Authority", "MahaRERA"];
  var APPROVAL_STATUS = ["Not Started", "Applied", "Under Scrutiny", "Query Raised", "Approved", "Rejected"];

  var ENTITIES = {
    /* ---------------- CRM & SALES ---------------- */
    leads: {
      key: "leads", title: "Leads & CRM", singular: "Lead", icon: "🎯", scope: "project",
      desc: "Capture and track enquiries through the sales funnel.",
      columns: [
        { f: "name", label: "Lead" },
        { f: "phone", label: "Phone" },
        { f: "interestType", label: "Interest" },
        { f: "budget", label: "Budget", type: "money" },
        { f: "source", label: "Source" },
        { f: "owner", label: "Owner" },
        { f: "stage", label: "Stage", type: "badge", map: { Booked: "good", Lost: "bad", "Site Visit": "info", Negotiation: "warn" } },
        { f: "nextFollowUp", label: "Follow-up", type: "date" }
      ],
      fields: [
        { f: "name", label: "Full name", type: "text", req: true },
        { f: "phone", label: "Phone", type: "phone", req: true },
        { f: "email", label: "Email", type: "email" },
        { f: "source", label: "Source", type: "select", options: LEAD_SOURCES },
        { f: "interestType", label: "Interested in", type: "select", options: UNIT_TYPES },
        { f: "budget", label: "Budget (₹)", type: "money" },
        { f: "owner", label: "Assigned to", type: "text" },
        { f: "stage", label: "Stage", type: "select", options: LEAD_STAGES, def: "New" },
        { f: "nextFollowUp", label: "Next follow-up", type: "date" },
        { f: "remarks", label: "Comments / Remarks", type: "textarea", full: true }
      ]
    },

    agreements: {
      key: "agreements", title: "Agreements", singular: "Agreement", icon: "📄", scope: "project",
      desc: "Sale agreements, allotment letters and registration tracking.",
      columns: [
        { f: "agreementNo", label: "Agreement #" },
        { f: "customer", label: "Customer" },
        { f: "unit", label: "Unit" },
        { f: "value", label: "Value", type: "money" },
        { f: "agreementDate", label: "Date", type: "date" },
        { f: "registrationStatus", label: "Registration", type: "badge", map: { Registered: "good", Pending: "warn", "Not Started": "muted" } }
      ],
      fields: [
        { f: "agreementNo", label: "Agreement number", type: "text", req: true },
        { f: "customer", label: "Customer name", type: "text", req: true },
        { f: "unit", label: "Unit / Flat no.", type: "text", req: true },
        { f: "value", label: "Agreement value (₹)", type: "money", req: true },
        { f: "agreementDate", label: "Agreement date", type: "date" },
        { f: "stampDuty", label: "Stamp duty (₹)", type: "money" },
        { f: "registrationStatus", label: "Registration status", type: "select", options: ["Not Started", "Pending", "Registered"], def: "Not Started" },
        { f: "registrationNo", label: "Registration no." , type: "text" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    letters: {
      key: "letters", title: "Letters & Formats", singular: "Letter", icon: "✉️", scope: "project",
      desc: "Bank loan NOCs, fit-out permissions, parking allotment & other standard letters.",
      columns: [
        { f: "type", label: "Type", type: "badge", map: {} },
        { f: "recipient", label: "Recipient" },
        { f: "unit", label: "Unit" },
        { f: "refNo", label: "Ref #" },
        { f: "issueDate", label: "Issued", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Issued: "good", Draft: "muted", Cancelled: "bad" } }
      ],
      fields: [
        { f: "type", label: "Letter type", type: "select", options: ["Bank NOC", "Demand Letter", "Fit-out Permission", "Parking Allotment", "Possession Letter", "Welcome Letter", "Reminder"], req: true },
        { f: "recipient", label: "Recipient / Bank", type: "text", req: true },
        { f: "unit", label: "Unit / Flat", type: "text" },
        { f: "refNo", label: "Reference no.", type: "text" },
        { f: "issueDate", label: "Issue date", type: "date" },
        { f: "status", label: "Status", type: "select", options: ["Draft", "Issued", "Cancelled"], def: "Draft" },
        { f: "body", label: "Notes / contents", type: "textarea", full: true }
      ]
    },

    /* ---------------- INVENTORY & PROPERTY ---------------- */
    units: {
      key: "units", title: "Inventory", singular: "Unit", icon: "🏢", scope: "project",
      desc: "Unit / flat inventory for the selected project, with live availability.",
      columns: [
        { f: "unitNo", label: "Unit #" },
        { f: "tower", label: "Tower/Wing" },
        { f: "type", label: "Type" },
        { f: "carpetArea", label: "Carpet (sqft)", type: "number" },
        { f: "ratePerSqft", label: "Rate/sqft", type: "money" },
        { f: "price", label: "Price", type: "money" },
        { f: "status", label: "Status", type: "badge", map: { Available: "good", Booked: "warn", Sold: "info", Registered: "info", Blocked: "muted", Mortgaged: "bad" } }
      ],
      fields: [
        { f: "unitNo", label: "Unit / Flat no.", type: "text", req: true },
        { f: "tower", label: "Tower / Wing", type: "text" },
        { f: "floor", label: "Floor", type: "number" },
        { f: "type", label: "Type", type: "select", options: UNIT_TYPES, def: "2 BHK" },
        { f: "carpetArea", label: "Carpet area (sqft)", type: "number" },
        { f: "builtUpArea", label: "Built-up area (sqft)", type: "number" },
        { f: "ratePerSqft", label: "Rate per sqft (₹)", type: "money" },
        { f: "price", label: "Total price (₹)", type: "money" },
        { f: "facing", label: "Facing", type: "select", options: ["East", "West", "North", "South", "North-East", "Sea-facing", "Garden"] },
        { f: "status", label: "Status", type: "select", options: UNIT_STATUS, def: "Available" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    properties: {
      key: "properties", title: "Property Details", singular: "Property", icon: "🏗️", scope: "company",
      desc: "Master property records across projects — survey, RERA, area & approvals.",
      columns: [
        { f: "name", label: "Property" },
        { f: "location", label: "Location" },
        { f: "surveyNo", label: "Survey/CTS" },
        { f: "totalArea", label: "Area (sqft)", type: "number" },
        { f: "reraNo", label: "RERA No." },
        { f: "status", label: "Status", type: "badge", map: { Active: "good", Planning: "warn", Completed: "info" } }
      ],
      fields: [
        { f: "name", label: "Property name", type: "text", req: true },
        { f: "location", label: "Location", type: "text" },
        { f: "surveyNo", label: "Survey / CTS no.", type: "text" },
        { f: "totalArea", label: "Total area (sqft)", type: "number" },
        { f: "reraNo", label: "MahaRERA no.", type: "text" },
        { f: "titleHolder", label: "Title holder", type: "text" },
        { f: "status", label: "Status", type: "select", options: ["Planning", "Active", "Completed"], def: "Active" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    plans: {
      key: "plans", title: "Plans & Drawings", singular: "Plan", icon: "📐", scope: "project",
      desc: "Approved drawings — architectural, structural, MEP, sanctioned plans.",
      columns: [
        { f: "title", label: "Drawing" },
        { f: "category", label: "Category" },
        { f: "revision", label: "Rev" },
        { f: "approvedBy", label: "Approved by" },
        { f: "date", label: "Date", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Approved: "good", "For Approval": "warn", Superseded: "muted" } }
      ],
      fields: [
        { f: "title", label: "Drawing title", type: "text", req: true },
        { f: "category", label: "Category", type: "select", options: ["Architectural", "Structural", "MEP", "Plumbing", "Electrical", "Sanctioned", "Layout"] },
        { f: "revision", label: "Revision", type: "text", def: "R0" },
        { f: "approvedBy", label: "Approving authority", type: "text" },
        { f: "date", label: "Date", type: "date" },
        { f: "status", label: "Status", type: "select", options: ["For Approval", "Approved", "Superseded"], def: "For Approval" },
        { f: "remarks", label: "Notes", type: "textarea", full: true }
      ]
    },

    rentals: {
      key: "rentals", title: "Rental Management", singular: "Lease", icon: "🔑", scope: "company",
      desc: "Leased / rented units, tenants, rent roll and renewals.",
      columns: [
        { f: "tenant", label: "Tenant" },
        { f: "unit", label: "Unit" },
        { f: "monthlyRent", label: "Rent/mo", type: "money" },
        { f: "deposit", label: "Deposit", type: "money" },
        { f: "leaseEnd", label: "Lease ends", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Active: "good", "Notice Period": "warn", Vacated: "muted", Overdue: "bad" } }
      ],
      fields: [
        { f: "tenant", label: "Tenant name", type: "text", req: true },
        { f: "unit", label: "Unit / Premises", type: "text", req: true },
        { f: "monthlyRent", label: "Monthly rent (₹)", type: "money" },
        { f: "deposit", label: "Security deposit (₹)", type: "money" },
        { f: "leaseStart", label: "Lease start", type: "date" },
        { f: "leaseEnd", label: "Lease end", type: "date" },
        { f: "escalation", label: "Escalation %", type: "percent" },
        { f: "status", label: "Status", type: "select", options: ["Active", "Notice Period", "Vacated", "Overdue"], def: "Active" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    /* ---------------- FINANCE ---------------- */
    payments: {
      key: "payments", title: "Payments (Received / Due)", singular: "Payment", icon: "💰", scope: "project",
      desc: "Customer receipts and outstanding demands against booked units.",
      columns: [
        { f: "customer", label: "Customer" },
        { f: "unit", label: "Unit" },
        { f: "milestone", label: "Milestone" },
        { f: "amount", label: "Amount", type: "money" },
        { f: "dueDate", label: "Due", type: "date" },
        { f: "mode", label: "Mode" },
        { f: "status", label: "Status", type: "badge", map: { Paid: "good", Due: "warn", "Partially Paid": "info", Overdue: "bad" } }
      ],
      fields: [
        { f: "customer", label: "Customer", type: "text", req: true },
        { f: "unit", label: "Unit / Flat", type: "text" },
        { f: "milestone", label: "Milestone / Stage", type: "text" },
        { f: "amount", label: "Amount (₹)", type: "money", req: true },
        { f: "dueDate", label: "Due date", type: "date" },
        { f: "receivedDate", label: "Received date", type: "date" },
        { f: "mode", label: "Mode", type: "select", options: ["NEFT", "RTGS", "UPI", "Cheque", "Cash", "Home Loan"] },
        { f: "status", label: "Status", type: "select", options: PAY_STATUS, def: "Due" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    creditors: {
      key: "creditors", title: "Creditors (Tally)", singular: "Creditor", icon: "📥", scope: "company", tally: true,
      desc: "Sundry creditors pulled from Tally. Use Sync to refresh outstanding payables.",
      columns: [
        { f: "name", label: "Ledger" },
        { f: "gstin", label: "GSTIN" },
        { f: "outstanding", label: "Outstanding", type: "money" },
        { f: "ageDays", label: "Age (days)", type: "number" },
        { f: "lastBill", label: "Last bill", type: "date" }
      ],
      fields: [
        { f: "name", label: "Ledger name", type: "text", req: true },
        { f: "gstin", label: "GSTIN", type: "text" },
        { f: "outstanding", label: "Outstanding (₹)", type: "money" },
        { f: "ageDays", label: "Age (days)", type: "number" },
        { f: "lastBill", label: "Last bill date", type: "date" }
      ]
    },

    debtors: {
      key: "debtors", title: "Debtors (Tally)", singular: "Debtor", icon: "📤", scope: "company", tally: true,
      desc: "Sundry debtors pulled from Tally. Use Sync to refresh outstanding receivables.",
      columns: [
        { f: "name", label: "Ledger" },
        { f: "gstin", label: "GSTIN" },
        { f: "outstanding", label: "Outstanding", type: "money" },
        { f: "ageDays", label: "Age (days)", type: "number" },
        { f: "lastBill", label: "Last bill", type: "date" }
      ],
      fields: [
        { f: "name", label: "Ledger name", type: "text", req: true },
        { f: "gstin", label: "GSTIN", type: "text" },
        { f: "outstanding", label: "Outstanding (₹)", type: "money" },
        { f: "ageDays", label: "Age (days)", type: "number" },
        { f: "lastBill", label: "Last bill date", type: "date" }
      ]
    },

    gst: {
      key: "gst", title: "GST", singular: "GST Entry", icon: "🧾", scope: "company",
      desc: "Output/Input GST register and return tracking (GSTR-1 / 3B).",
      columns: [
        { f: "period", label: "Period" },
        { f: "type", label: "Type", type: "badge", map: { Output: "info", Input: "good" } },
        { f: "taxable", label: "Taxable", type: "money" },
        { f: "igst", label: "IGST", type: "money" },
        { f: "cgst", label: "CGST", type: "money" },
        { f: "sgst", label: "SGST", type: "money" },
        { f: "returnStatus", label: "Return", type: "badge", map: { Filed: "good", Pending: "warn", Late: "bad" } }
      ],
      fields: [
        { f: "period", label: "Period (e.g. Jun-2026)", type: "text", req: true },
        { f: "type", label: "Type", type: "select", options: ["Output", "Input"], def: "Output" },
        { f: "taxable", label: "Taxable value (₹)", type: "money" },
        { f: "igst", label: "IGST (₹)", type: "money" },
        { f: "cgst", label: "CGST (₹)", type: "money" },
        { f: "sgst", label: "SGST (₹)", type: "money" },
        { f: "returnStatus", label: "Return status", type: "select", options: ["Pending", "Filed", "Late"], def: "Pending" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    tds: {
      key: "tds", title: "TDS", singular: "TDS Entry", icon: "✂️", scope: "company",
      desc: "TDS deducted on contractor / professional payments and challan tracking.",
      columns: [
        { f: "deductee", label: "Deductee" },
        { f: "section", label: "Section" },
        { f: "amountPaid", label: "Paid", type: "money" },
        { f: "tdsAmount", label: "TDS", type: "money" },
        { f: "rate", label: "Rate", type: "percent" },
        { f: "challanStatus", label: "Challan", type: "badge", map: { Deposited: "good", Pending: "warn" } }
      ],
      fields: [
        { f: "deductee", label: "Deductee name", type: "text", req: true },
        { f: "pan", label: "PAN", type: "text" },
        { f: "section", label: "Section", type: "select", options: ["194C", "194J", "194I", "194Q", "194H", "192", "194A"] },
        { f: "amountPaid", label: "Amount paid (₹)", type: "money" },
        { f: "rate", label: "TDS rate %", type: "percent" },
        { f: "tdsAmount", label: "TDS amount (₹)", type: "money" },
        { f: "challanStatus", label: "Challan status", type: "select", options: ["Pending", "Deposited"], def: "Pending" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    /* ---------------- PROCUREMENT & PROJECTS ---------------- */
    vendors: {
      key: "vendors", title: "Vendors / Suppliers", singular: "Vendor", icon: "🤝", scope: "company",
      desc: "Supplier master. The Vendor Portal lets them log bills & track payments.",
      columns: [
        { f: "name", label: "Vendor" },
        { f: "category", label: "Category" },
        { f: "contact", label: "Contact" },
        { f: "gstin", label: "GSTIN" },
        { f: "outstanding", label: "Outstanding", type: "money" },
        { f: "rating", label: "Rating", type: "badge", map: { A: "good", B: "info", C: "warn" } }
      ],
      fields: [
        { f: "name", label: "Vendor name", type: "text", req: true },
        { f: "category", label: "Category", type: "select", options: ["Cement", "Steel", "RMC", "Electrical", "Plumbing", "Tiles", "Labour Contractor", "Lift", "Paint", "Consultant", "Other"] },
        { f: "contact", label: "Contact person", type: "text" },
        { f: "phone", label: "Phone", type: "phone" },
        { f: "email", label: "Email", type: "email" },
        { f: "gstin", label: "GSTIN", type: "text" },
        { f: "pan", label: "PAN", type: "text" },
        { f: "outstanding", label: "Outstanding (₹)", type: "money" },
        { f: "rating", label: "Rating", type: "select", options: ["A", "B", "C"], def: "B" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    purchases: {
      key: "purchases", title: "Purchase", singular: "Purchase Order", icon: "🛒", scope: "project",
      desc: "Material purchase orders against vendors and projects.",
      columns: [
        { f: "poNo", label: "PO #" },
        { f: "vendor", label: "Vendor" },
        { f: "item", label: "Item" },
        { f: "qty", label: "Qty", type: "number" },
        { f: "amount", label: "Amount", type: "money" },
        { f: "poDate", label: "Date", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Received: "good", Ordered: "info", Draft: "muted", Cancelled: "bad" } }
      ],
      fields: [
        { f: "poNo", label: "PO number", type: "text", req: true },
        { f: "vendor", label: "Vendor", type: "text", req: true },
        { f: "item", label: "Item / Material", type: "text" },
        { f: "qty", label: "Quantity", type: "number" },
        { f: "unitName", label: "Unit (bags/MT/nos)", type: "text" },
        { f: "amount", label: "Amount (₹)", type: "money" },
        { f: "poDate", label: "PO date", type: "date" },
        { f: "status", label: "Status", type: "select", options: ["Draft", "Ordered", "Received", "Cancelled"], def: "Draft" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    workorders: {
      key: "workorders", title: "Work Orders", singular: "Work Order", icon: "🧰", scope: "project",
      desc: "Contractor work orders with value, scope and progress.",
      columns: [
        { f: "woNo", label: "WO #" },
        { f: "contractor", label: "Contractor" },
        { f: "scope", label: "Scope" },
        { f: "value", label: "Value", type: "money" },
        { f: "progress", label: "Progress", type: "percent" },
        { f: "status", label: "Status", type: "badge", map: { Completed: "good", "In Progress": "info", Issued: "warn", "On Hold": "bad", Draft: "muted", Closed: "muted" } }
      ],
      fields: [
        { f: "woNo", label: "Work order number", type: "text", req: true },
        { f: "contractor", label: "Contractor", type: "text", req: true },
        { f: "scope", label: "Scope of work", type: "text" },
        { f: "value", label: "WO value (₹)", type: "money" },
        { f: "startDate", label: "Start date", type: "date" },
        { f: "endDate", label: "Target end", type: "date" },
        { f: "progress", label: "Progress %", type: "percent", def: 0 },
        { f: "status", label: "Status", type: "select", options: WO_STATUS, def: "Draft" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    schedule: {
      key: "schedule", title: "Work Schedule", singular: "Schedule Task", icon: "🗓️", scope: "project",
      desc: "Construction schedule with reminders to contractors.",
      columns: [
        { f: "task", label: "Task" },
        { f: "contractor", label: "Contractor" },
        { f: "start", label: "Start", type: "date" },
        { f: "end", label: "Due", type: "date" },
        { f: "reminder", label: "Reminder", type: "badge", map: { Sent: "good", Scheduled: "info", Overdue: "bad" } },
        { f: "status", label: "Status", type: "badge", map: { Done: "good", "In Progress": "info", Pending: "warn", Delayed: "bad" } }
      ],
      fields: [
        { f: "task", label: "Task / Activity", type: "text", req: true },
        { f: "contractor", label: "Contractor / Owner", type: "text" },
        { f: "phone", label: "Contractor phone", type: "phone" },
        { f: "start", label: "Start date", type: "date" },
        { f: "end", label: "Due date", type: "date" },
        { f: "reminder", label: "Reminder", type: "select", options: ["Scheduled", "Sent", "Overdue"], def: "Scheduled" },
        { f: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Done", "Delayed"], def: "Pending" },
        { f: "remarks", label: "Notes", type: "textarea", full: true }
      ]
    },

    construction: {
      key: "construction", title: "Stage of Construction", singular: "Stage Update", icon: "🏗️", scope: "project",
      desc: "Project-wise construction progress against standard stages.",
      columns: [
        { f: "block", label: "Tower/Block" },
        { f: "stage", label: "Current stage" },
        { f: "progress", label: "Progress", type: "percent" },
        { f: "updatedOn", label: "Updated", type: "date" },
        { f: "engineer", label: "Site Engineer" }
      ],
      fields: [
        { f: "block", label: "Tower / Block", type: "text", req: true },
        { f: "stage", label: "Current stage", type: "select", options: CONSTRUCTION_STAGES, def: "Plinth" },
        { f: "progress", label: "Overall progress %", type: "percent", def: 0 },
        { f: "updatedOn", label: "Updated on", type: "date" },
        { f: "engineer", label: "Site engineer", type: "text" },
        { f: "remarks", label: "Site notes", type: "textarea", full: true }
      ]
    },

    liaisoning: {
      key: "liaisoning", title: "Liaisoning", singular: "Approval", icon: "🏛️", scope: "project",
      desc: "Approvals & follow-ups with BMC, VVCMC, MMRDA, Fire, RERA, etc.",
      columns: [
        { f: "approval", label: "Approval" },
        { f: "authority", label: "Authority", type: "badge", map: {} },
        { f: "fileNo", label: "File #" },
        { f: "appliedDate", label: "Applied", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Approved: "good", "Query Raised": "warn", Rejected: "bad", Applied: "info", "Under Scrutiny": "info", "Not Started": "muted" } }
      ],
      fields: [
        { f: "approval", label: "Approval / Permission", type: "text", req: true },
        { f: "authority", label: "Authority", type: "select", options: APPROVAL_BODIES, req: true },
        { f: "fileNo", label: "File / Application no.", type: "text" },
        { f: "appliedDate", label: "Applied date", type: "date" },
        { f: "consultant", label: "Liaison consultant", type: "text" },
        { f: "nextFollowUp", label: "Next follow-up date", type: "date" },
        { f: "status", label: "Status", type: "select", options: APPROVAL_STATUS, def: "Not Started" },
        { f: "remarks", label: "Remarks / follow-up", type: "textarea", full: true }
      ]
    },

    /* ---------------- LEGAL & LAND ---------------- */
    legaldocs: {
      key: "legaldocs", title: "Legal Documents", singular: "Document", icon: "⚖️", scope: "company",
      desc: "Title deeds, 7/12 extracts, NA orders, agreements & legal records.",
      columns: [
        { f: "title", label: "Document" },
        { f: "docType", label: "Type" },
        { f: "refNo", label: "Ref #" },
        { f: "party", label: "Party" },
        { f: "date", label: "Date", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Verified: "good", Pending: "warn", Disputed: "bad" } }
      ],
      fields: [
        { f: "title", label: "Document title", type: "text", req: true },
        { f: "docType", label: "Type", type: "select", options: ["Title Deed", "7/12 Extract", "NA Order", "Index II", "Sale Deed", "Power of Attorney", "Search Report", "Mutation Entry", "Other"] },
        { f: "refNo", label: "Reference no.", type: "text" },
        { f: "party", label: "Party / Owner", type: "text" },
        { f: "date", label: "Document date", type: "date" },
        { f: "status", label: "Status", type: "select", options: ["Pending", "Verified", "Disputed"], def: "Pending" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    land: {
      key: "land", title: "Land Management", singular: "Land Parcel", icon: "🌄", scope: "company",
      desc: "Land bank — acquisition stage, litigation status and reminders.",
      columns: [
        { f: "parcel", label: "Parcel" },
        { f: "village", label: "Village" },
        { f: "surveyNo", label: "Survey/Gut" },
        { f: "area", label: "Area (acre)", type: "number" },
        { f: "stage", label: "Stage", type: "badge", map: { Registered: "good", Litigation: "bad", "Under Negotiation": "warn", Development: "info" } },
        { f: "reminderDate", label: "Reminder", type: "date" }
      ],
      fields: [
        { f: "parcel", label: "Parcel name", type: "text", req: true },
        { f: "village", label: "Village / Taluka", type: "text" },
        { f: "surveyNo", label: "Survey / Gut no.", type: "text" },
        { f: "area", label: "Area (acres)", type: "number" },
        { f: "owner", label: "Land owner", type: "text" },
        { f: "totalConsideration", label: "Total consideration (₹)", type: "money" },
        { f: "amountPaid", label: "Amount paid (₹)", type: "money" },
        { f: "stage", label: "Stage", type: "select", options: LAND_STAGES, def: "Identified" },
        { f: "litigation", label: "Litigation status", type: "select", options: ["None", "Pending", "Resolved"], def: "None" },
        { f: "courtRef", label: "Linked court / CNR", type: "text" },
        { f: "reminderDate", label: "Next reminder / action date", type: "date" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    /* ---------------- HR ---------------- */
    payroll: {
      key: "payroll", title: "Payroll", singular: "Employee", icon: "👥", scope: "company",
      desc: "Employee master and monthly salary processing.",
      columns: [
        { f: "name", label: "Employee" },
        { f: "designation", label: "Designation" },
        { f: "department", label: "Department" },
        { f: "ctc", label: "Monthly CTC", type: "money" },
        { f: "netPay", label: "Net pay", type: "money" },
        { f: "status", label: "Status", type: "badge", map: { Processed: "good", Pending: "warn", Hold: "bad" } }
      ],
      fields: [
        { f: "name", label: "Employee name", type: "text", req: true },
        { f: "designation", label: "Designation", type: "text" },
        { f: "department", label: "Department", type: "select", options: ["Sales", "Accounts", "Site/Projects", "Legal", "Admin", "HR", "Purchase", "Liaisoning"] },
        { f: "ctc", label: "Monthly CTC (₹)", type: "money" },
        { f: "deductions", label: "Deductions (₹)", type: "money" },
        { f: "netPay", label: "Net pay (₹)", type: "money" },
        { f: "status", label: "Pay status", type: "select", options: ["Pending", "Processed", "Hold"], def: "Pending" },
        { f: "remarks", label: "Remarks", type: "textarea", full: true }
      ]
    },

    reimbursements: {
      key: "reimbursements", title: "Reimbursements & Petty Cash", singular: "Claim", icon: "🧾", scope: "company",
      desc: "Staff reimbursements and petty cash vouchers.",
      columns: [
        { f: "claimant", label: "Claimant" },
        { f: "category", label: "Category" },
        { f: "amount", label: "Amount", type: "money" },
        { f: "date", label: "Date", type: "date" },
        { f: "status", label: "Status", type: "badge", map: { Approved: "good", Paid: "info", Pending: "warn", Rejected: "bad" } }
      ],
      fields: [
        { f: "claimant", label: "Claimant", type: "text", req: true },
        { f: "category", label: "Category", type: "select", options: ["Travel", "Fuel", "Site Expense", "Office Supplies", "Food", "Courier", "Govt Fees", "Misc"] },
        { f: "amount", label: "Amount (₹)", type: "money", req: true },
        { f: "date", label: "Date", type: "date" },
        { f: "mode", label: "Paid from", type: "select", options: ["Petty Cash", "Bank", "Card"] },
        { f: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Paid", "Rejected"], def: "Pending" },
        { f: "remarks", label: "Remarks / bill no.", type: "textarea", full: true }
      ]
    }
  };

  // Navigation groups -> entity keys or special view ids (special views handled in app.js)
  var NAV = [
    { group: "Overview", items: [
      { id: "dashboard", title: "Dashboard", icon: "📊", special: true },
      { id: "group", title: "Group Overview", icon: "🌐", special: true },
      { id: "reports", title: "Reports & MIS", icon: "📈", special: true },
      { id: "approvals", title: "Approvals Inbox", icon: "📨", special: true }
    ]},
    { group: "CRM & Sales", items: [
      { entity: "leads" },
      { id: "booking", title: "New Booking", icon: "🏷️", special: true },
      { id: "calendar", title: "Follow-up Calendar", icon: "📅", special: true },
      { id: "customer360", title: "Customer 360", icon: "👤", special: true },
      { id: "whatsapp", title: "WhatsApp Blast", icon: "💬", special: true },
      { id: "email", title: "Email Campaigns", icon: "📧", special: true },
      { entity: "agreements" },
      { id: "letters", title: "Letters & Formats", icon: "✉️", special: true }
    ]},
    { group: "Inventory & Property", items: [
      { entity: "units" },
      { entity: "properties" },
      { entity: "plans" },
      { id: "locations", title: "Locations Map", icon: "🗺️", special: true },
      { entity: "rentals" },
      { id: "rentdesk", title: "Rent Roll", icon: "📋", special: true }
    ]},
    { group: "Finance", items: [
      { id: "collections", title: "Collections & Reminders", icon: "📒", special: true },
      { entity: "payments" },
      { entity: "creditors" },
      { entity: "debtors" },
      { id: "bank", title: "Bank Balances (Axis)", icon: "🏦", special: true },
      { id: "netbanking", title: "Net Banking Payments", icon: "🔁", special: true },
      { entity: "gst" },
      { entity: "tds" }
    ]},
    { group: "Procurement & Projects", items: [
      { id: "vendorportal", title: "Vendor Portal", icon: "🌐", special: true },
      { entity: "vendors" },
      { id: "budget", title: "Budget vs Actual", icon: "💹", special: true },
      { entity: "purchases" },
      { entity: "workorders" },
      { entity: "schedule" },
      { entity: "construction" },
      { entity: "liaisoning" }
    ]},
    { group: "Legal & Land", items: [
      { entity: "legaldocs" },
      { entity: "land" },
      { id: "landdesk", title: "Land Desk", icon: "🗺️", special: true },
      { id: "ecourts", title: "E-Courts", icon: "👨‍⚖️", special: true }
    ]},
    { group: "HR", items: [
      { entity: "payroll" },
      { entity: "reimbursements" }
    ]},
    { group: "System", items: [
      { id: "documents", title: "Document Vault", icon: "📎", special: true },
      { id: "settings", title: "Settings & Integrations", icon: "🔌", special: true },
      { id: "datamanager", title: "Data Manager", icon: "🗄️", special: true },
      { id: "setup", title: "Companies & Projects", icon: "🏢", special: true }
    ]}
  ];

  global.Schema = { ENTITIES: ENTITIES, NAV: NAV, sets: {
    LEAD_STAGES: LEAD_STAGES, UNIT_STATUS: UNIT_STATUS, CONSTRUCTION_STAGES: CONSTRUCTION_STAGES,
    APPROVAL_BODIES: APPROVAL_BODIES, LAND_STAGES: LAND_STAGES
  }};
})(window);
