console.log("🔥🔥🔥 SARN SERVER.JS LOADED 🔥🔥🔥", __filename);

// ================== IMPORTS ==================
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");

// ================== FIREBASE INIT (PRODUCTION) ==================
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "sarn-technologies-21d6e", 
  storageBucket: "sarn-technologies-21d6e.appspot.com", 
});

const db = admin.firestore();
const bucket = admin.storage().bucket(
  "sarn-technologies-21d6e.firebasestorage.app"
);
console.log("BUCKET:", bucket.name);


// ================== EXPRESS ==================
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({ storage: multer.memoryStorage() });

// ================== TEST FIRESTORE ==================
app.get("/test-firestore", async (req, res) => {
  try {
    await db.collection("ping").add({
      time: Date.now(),
      status: "ok",
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("TEST FIRESTORE ERROR:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});


// ================== HELPERS ==================
// ======================= COMMON HELPERS (REQUIRED) =======================

// Sheet normalizer (DQ + SDS SAFE)
function normalizeSheetName(sheet) {
  return String(sheet || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

// Unified error response (prevents server crash)
function errJson(res, message = "Server error", code = 500) {
  return res.status(code).json({ ok: false, error: message });
}

// Generic normalizer (USED BY WORKFLOW ROUTES)
function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

// Timestamp helper
function now() {
  return Date.now();
}


// ================== HEALTH ==================
app.get("/", (req, res) => {
  res.send("SARN Backend Running ✅");
});


// ============================================================================
//  AUTH: LOGIN (WITH ATTENDANCE)
// ============================================================================

app.post("/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.json({ ok: false, error: "Missing credentials" });
    }

    // ================= SUPER ADMIN (NO ATTENDANCE) =================
const cleanUserId = String(userId || "").trim();
const cleanPassword = String(password || "").trim();

if (
  cleanUserId === "SARN0001" &&
  cleanPassword === "Sarn@AdminApp"
) {
  return res.json({
    ok: true,
    user: {
      userId: "SARN0001",
      role: "superadmin",
      mustReset: false,
      name: "Super Admin",
    },
  });
}


    // ================= NORMAL USER / ADMIN =================
    const id = userId.trim().toUpperCase();
    const snap = await db.collection("users").doc(id).get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

    const user = snap.data();

    if (user.password !== password) {
      return res.json({ ok: false, error: "Invalid password" });
    }

    
    await markLogin({
      userId: user.userId,
      name: user.name || "",
      role: user.role.toLowerCase(), 
    });

    res.json({
      ok: true,
      user: {
        userId: user.userId,
        role: user.role,
        mustReset: user.mustReset || false,
        name: user.name || "",
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

// ============================================================================
//  AUTH: CREATE USER (MATCHES FRONTEND EXACTLY)
// ============================================================================
app.post("/auth/create-user", async (req, res) => {
  try {
    const { name, role } = req.body;

    if (!name || !role) {
      return res.json({ ok: false, error: "Missing fields" });
    }

   
    const userId =
      "SARN" +
      Math.floor(1000 + Math.random() * 9000); 

    const tempPassword = "Welcome@123";

    const ref = db.collection("users").doc(userId);
    const snap = await ref.get();

    if (snap.exists) {
      return res.json({ ok: false, error: "Try again (ID collision)" });
    }

    await ref.set({
      userId,
      name,
      role,              
      password: tempPassword,
      mustReset: true,
      createdAt: Date.now(),
    });

    
    res.json({
      ok: true,
      userId,
      tempPassword,
    });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ============================================================================
//  AUTH: RESET PASSWORD
// ============================================================================
app.post("/auth/reset", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const id = userId.trim().toUpperCase();

    const ref = db.collection("users").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

    await ref.update({
      password: newPassword,
      mustReset: false,
      updatedAt: Date.now(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ ok: false, error: "Reset failed" });
  }
});
// ============================================================================
//  SUPER ADMIN: FORCE RESET USER PASSWORD (GENERATE TEMP PASSWORD)
// ============================================================================

app.post("/super-admin/reset-password", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ ok: false, error: "User ID required" });
    }

    const id = userId.trim().toUpperCase();

    const ref = db.collection("users").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

    
    const tempPassword =
      "SARN@" + Math.floor(1000 + Math.random() * 9000);

    await ref.update({
      password: tempPassword,
      mustReset: true,
      updatedAt: Date.now(),
    });

    
    res.json({
      ok: true,
      userId: id,
      tempPassword,
    });
  } catch (err) {
    console.error("SUPER ADMIN RESET ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});
// ============================================================================
//  SUPER ADMIN: DELETE USER
// ============================================================================

app.post("/super-admin/delete-user", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ ok: false, error: "User ID required" });
    }

    const id = userId.trim().toUpperCase();

    const ref = db.collection("users").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

  
    if (snap.data().role === "super_admin") {
      return res.json({ ok: false, error: "Cannot delete super admin" });
    }

    await ref.delete();

    res.json({
      ok: true,
      userId: id,
    });
  } catch (err) {
    console.error("SUPER ADMIN DELETE ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});
// ================= ATTENDANCE: LOGIN =================
async function markLogin(user) {
  const today = new Date().toISOString().slice(0, 10);
  const docId = `${user.userId}_${today}`;

  const ref = db.collection("attendance_logs").doc(docId);
  const snap = await ref.get();

  const now = Date.now();

  if (!snap.exists) {
    await ref.set({
      userId: user.userId,
      name: user.name,          
      role: user.role,
      date: today,

      sessions: [
        {
          loginTime: now,
          logoutTime: null,
          durationMinutes: 0,
        },
      ],

      totalMinutes: 0,
      expectedMinutes: 420,
      status: "IN_PROGRESS",
      lastUpdated: now,
    });
  } else {
    const data = snap.data();

  
    const lastSession = data.sessions[data.sessions.length - 1];
    if (lastSession && lastSession.logoutTime === null) return;

    await ref.update({
      sessions: [
        ...data.sessions,
        {
          loginTime: now,
          logoutTime: null,
          durationMinutes: 0,
        },
      ],
      status: "IN_PROGRESS",
      lastUpdated: now,
    });
  }
}

// ================= ATTENDANCE: LOGOUT =================
app.post("/auth/logout", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.json({ ok: false });

    const today = new Date().toISOString().slice(0, 10);
    const docId = `${userId}_${today}`;

    const ref = db.collection("attendance_logs").doc(docId);
    const snap = await ref.get();
    if (!snap.exists) return res.json({ ok: true });

    const data = snap.data();
    const now = Date.now();

    const sessions = [...data.sessions];
    const last = sessions[sessions.length - 1];

    if (!last || last.logoutTime) {
      return res.json({ ok: true });
    }

    last.logoutTime = now;
    last.durationMinutes = Math.floor(
      (now - last.loginTime) / 60000
    );

    const totalMinutes = sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    await ref.update({
      sessions,
      totalMinutes,
      status: "COMPLETED",
      lastUpdated: now,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("LOGOUT ERROR", err);
    res.json({ ok: false });
  }
});


// ================= SUPER ADMIN: VIEW ATTENDANCE =================
app.get("/super-admin/attendance", async (req, res) => {
  try {
    const { date, month } = req.query;

    let query = db.collection("attendance_logs");

    if (date) {
      query = query.where("date", "==", date);
    }

    if (month) {
      query = query
        .where("date", ">=", `${month}-01`)
        .where("date", "<=", `${month}-31`);
    }

    const snap = await query.get();
    const rows = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ ok: true, rows });
  } catch (err) {
    console.error("ATTENDANCE FETCH ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// SUPER ADMIN: FETCH ATTENDANCE (WITH DATE / MONTH FILTER)
// ============================================================================

app.get("/super-admin/attendance", async (req, res) => {
  try {
    const { date, month } = req.query;

    let query = db.collection("attendance_logs");

    if (date) {
      query = query.where("date", "==", date);
    }

    if (month) {
     
      query = query
        .where("date", ">=", `${month}-01`)
        .where("date", "<=", `${month}-31`);
    }

    const snap = await query.get();
    const rows = snap.docs.map(d => d.data());

    res.json({ ok: true, rows });
  } catch (err) {
    console.error("ATTENDANCE FETCH ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ============================================================================
// ATTENDANCE RETENTION — KEEP ONLY LAST 3 MONTHS
// ============================================================================

async function cleanupOldAttendance() {
  try {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - 3);

    const cutoffDate = cutoff.toISOString().slice(0, 10); 

    const snap = await db
      .collection("attendance_logs")
      .where("date", "<", cutoffDate)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🧹 Deleted ${snap.size} old attendance records`);
  } catch (err) {
    console.error("ATTENDANCE CLEANUP ERROR:", err);
  }
}

// SDS MODULE
/* =====================================================================
   SDS UPLOAD — FINAL FIXED (MANUFACTURER NAME BUG RESOLVED)
===================================================================== */
app.post("/sds/upload", upload.single("file"), async (req, res) => {
  try {
    const sheet = String(req.body.sheet || "").trim();
    if (!sheet || !req.file) {
      return res.json({ ok: false, error: "Sheet or file missing" });
    }

    await db.collection("sds_sheets").doc(sheet).set(
      {
        sheetId: sheet,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    
    const wb = XLSX.read(req.file.buffer, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      return res.json({ ok: false, error: "Empty Excel file" });
    }  

function formatDate(val) {
  if (!val && val !== 0) return "";

  // Excel number (like 44665)
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }

  // JS Date
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }

  // String
  if (typeof val === "string") {
    const parsed = new Date(val);
    if (!isNaN(parsed)) {
      return parsed.toISOString().split("T")[0];
    }
  }

  return "";
}

    let batch = db.batch();
    let ops = 0;
    let count = 0;

    for (const r of rows) {
      console.log("INPUT:", r["Revision Date"]);
      console.log("OUTPUT:", formatDate(r["Revision Date"]));
      const refRaw =
        r["Repository Number"] ||
        r["repositoryNumber"] ||
        "";

      if (!refRaw) continue;

      const refId = normalize(refRaw);

      const common = {
        businessEntity: String(
          r["Business Entity"] || r["businessEntity"] || ""
        ).trim(),

        repositoryNumber: String(
          r["Repository Number"] || r["repositoryNumber"] || ""
        ).trim(),

        chemicalProduct: String(
          r["Chemical Product"] || r["chemicalProduct"] || ""
        ).trim(),

        manufacturerName: String(
          r["Manufacturer's Name"] ||
          r["Manufacturer Name"] ||
          r["MANUFACTURER NAME"] ||
          r["Manufacturer"] ||
          r["manufacturerName"] ||
          ""
        ).trim(),

      revisionDate: formatDate(
        r["Revision Date"] ?? r["revisionDate"]
      ),

      verificationDate: formatDate(
        r["Verification Date"] ?? r["verificationDate"]
      ),

      };

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const existingDoc = await refDoc.get();
      batch.set(
  refDoc,
  {
    referenceId: refId,
    common,
    currentStage: "search",
    workflowStatus: "ASSIGN_PENDING",
    nextStage: "search",
    
    duplicate: existingDoc.exists || false,
    duplicateUpdatedAt: existingDoc.exists ? Date.now() : null,


    updatedAt: Date.now(),
  },
  { merge: true }
);

      ops++;
      count++;

      if (ops === 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();

    res.json({ ok: true, count });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// GET UNIQUE MANUFACTURER NAMES FOR A SHEET
// ============================================================================

app.get("/admin/sds/manufacturer-names", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) {
      return res.json({ ok: true, manufacturers: [] });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const set = new Set();

    snap.forEach(doc => {
      const m = doc.data().common?.manufacturerName;
      if (m && String(m).trim()) {
        set.add(String(m).trim());
      }
    });

    res.json({
      ok: true,
      manufacturers: Array.from(set).sort(),
    });
  } catch (err) {
    console.error("MANUFACTURER NAME LIST ERROR:", err);
    res.status(500).json({ ok: false, manufacturers: [] });
  }
});


// ============================================================================
// GET UNIQUE Business enitites  (= BUSINESS ENTITIES) FOR A SHEET — FINAL
// ============================================================================

app.get("/admin/sds/manufacturers", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) {
      return res.json({ ok: true, manufacturers: [] });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const set = new Set();

    snap.forEach(doc => {
      const m = doc.data().common?.businessEntity; 
      if (m && String(m).trim()) {
        set.add(String(m).trim());
      }
    });

    res.json({
      ok: true,
      manufacturers: Array.from(set).sort(),
    });
  } catch (err) {
    console.error("MANUFACTURER LIST ERROR:", err);
    res.status(500).json({ ok: false, manufacturers: [] });
  }
});
// ============================================================================
// GET UNIQUE MANUFACTURER NAMES FOR A SHEET
// ============================================================================

app.get("/admin/sds/manufacturer-names", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) {
      return res.json({ ok: true, manufacturers: [] });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const set = new Set();

    snap.forEach(doc => {
      const m = doc.data().common?.manufacturerName;
      if (m && String(m).trim()) {
        set.add(String(m).trim());
      }
    });

    res.json({
      ok: true,
      manufacturers: Array.from(set).sort(),
    });
  } catch (err) {
    console.error("MANUFACTURER NAME LIST ERROR:", err);
    res.status(500).json({ ok: false, manufacturers: [] });
  }
});


// ===================================================================
// GET SINGLE SDS REFERENCE (USED BY ViewReference.jsx)
// Route: /references/:company/:sheet/:refId
// ===================================================================
app.get("/references/:company/:sheet/:refId", async (req, res) => {
  try {
    const sheet = normalize(req.params.sheet);
    const refId = normalize(req.params.refId);

    const docRef = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    const snap = await docRef.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const data = snap.data();

  
    res.json({
      ok: true,
      reference: {
        referenceId: refId,
        common: data.common || {},
        search: data.search || {},
        supersede: data.supersede || {},
        transcription: data.transcription || {},
        billing: data.billing || {},
        currentStage: data.currentStage || "search",
        assignedTo: data.assignedTo || null,
      },
    });
  } catch (err) {
    console.error("GET REFERENCE ERROR:", err);
    res.status(500).json({ ok: false, error: "Failed to load reference" });
  }
});

// =====================================================
// VIEW SINGLE SDS REFERENCE (Admin ViewReference.jsx)
// =====================================================
app.get("/references/:company/:sheet/:id", async (req, res) => {
  try {
   
    const company = normalize(req.params.company); // kept for frontend compatibility
    const sheet = normalize(req.params.sheet);
    const refId = normalize(req.params.id);


    if (!sheet || !refId) {
      return res.json({ ok: false, error: "Invalid parameters" });
    }

    const refSnap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId)
      .get();

    if (!refSnap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const d = refSnap.data();

   
    const reference = {
      referenceId: d.referenceId,

    
      common: d.common || {},

      search: d.search || { status: "pending" },
      supersede: d.supersede || { status: "waiting" },
      transcription: d.transcription || { status: "waiting" },
      billing: d.billing || { status: "waiting" },

      currentStage: d.currentStage || "search",
      assignedTo: d.assignedTo || null,
    };

    res.json({ ok: true, reference });
  } catch (err) {
    console.error("VIEW REFERENCE ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load reference",
    });
  }
});
// ============================================================================
// PRODUCTIVITY REPORT
// ============================================================================
app.get("/admin/workflow/productivity", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    if (!sheet || !fromDate || !toDate) {
      return res.json({
        ok: false,
        error: "sheet, fromDate and toDate are required",
      });
    }

    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);

    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const stats = {};

    let totalRecords = 0;
    let assignedRecords = 0;
    let completedRecords = 0;

    const stages = [
      "search",
      "supersede",
      "transcription",
      "billing",
    ];

    snap.forEach((doc) => {
      const d = doc.data();

      totalRecords++;

      stages.forEach((stage) => {
        const stageData = d[stage];

        if (!stageData) return;

        const assignedTo = stageData.assignedTo;
        const assignedAt = stageData.assignedAt;
        const completedAt = stageData.completedAt;

        // ---------------- ASSIGNED ----------------
        if (
          assignedTo &&
          assignedAt &&
          assignedAt.toDate
        ) {
          const assignDate = assignedAt.toDate();

          if (assignDate >= from && assignDate <= to) {
            assignedRecords++;

            if (!stats[assignedTo]) {
              stats[assignedTo] = {
                userId: assignedTo,
                assigned: 0,
                completed: 0,
                pending: 0,
              };
            }

            stats[assignedTo].assigned++;
          }
        }

        // ---------------- COMPLETED ----------------
        if (
          assignedTo &&
          completedAt &&
          completedAt.toDate
        ) {
          const completeDate = completedAt.toDate();

          if (completeDate >= from && completeDate <= to) {
            completedRecords++;

            if (!stats[assignedTo]) {
              stats[assignedTo] = {
                userId: assignedTo,
                assigned: 0,
                completed: 0,
                pending: 0,
              };
            }

            stats[assignedTo].completed++;
          }
        }
      });
    });

    const users = Object.values(stats).map((u) => ({
      ...u,
      pending: Math.max(0, u.assigned - u.completed),
      completionPercent:
        u.assigned > 0
          ? Number(
              ((u.completed / u.assigned) * 100).toFixed(2)
            )
          : 0,
    }));

    return res.json({
      ok: true,
      summary: {
        totalRecords,
        assignedRecords,
        completedRecords,
        headCount: users.length,
      },
      users,
    });
  } catch (err) {
    console.error("PRODUCTIVITY ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

//GET /admin/workflow/user-assigned-report
app.get("/admin/workflow/user-assigned-report", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const userId = req.query.userId;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    if (!sheet || !userId || !fromDate || !toDate) {
      return res.json({
        ok: false,
        rows: [],
      });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const rows = [];

    snap.forEach(doc => {
      const d = doc.data();

      [
        { name: "search", data: d.search },
        { name: "supersede", data: d.supersede },
        { name: "transcription", data: d.transcription },
        { name: "billing", data: d.billing },
      ].forEach(stage => {
        if (!stage.data?.assignedTo) return;

        if (stage.data.assignedTo !== userId) return;

        if (!stage.data.assignedAt) return;

        const assignedDate =
          stage.data.assignedAt.toDate
            ? stage.data.assignedAt.toDate()
            : new Date(stage.data.assignedAt);

        if (assignedDate < from || assignedDate > to) return;

        rows.push({
          repositoryNumber:
            d.common?.repositoryNumber || "",
          referenceId:
            d.referenceId || doc.id,
          stage: stage.name,
          assignedTo: userId,
          assignedDate,
          businessEntity:
            d.common?.businessEntity || "",
          chemicalProduct:
            d.common?.chemicalProduct || "",
        });
      });
    });

    return res.json({
      ok: true,
      total: rows.length,
      rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      rows: [],
    });
  }
});
// =====================================================================
// GET SDS SHEETS — SINGLE SOURCE OF TRUTH (DO NOT DUPLICATE)
// =====================================================================
app.get("/sds/sheets", async (req, res) => {
  try {
    const snap = await db.collection("sds_sheets").get();
    const sheets = snap.docs.map(d => d.id);

    console.log("📄 SDS SHEETS:", sheets);

    return res.json({
      ok: true,
      sheets,                 
      companies: ["SARN"],    
    });
  } catch (err) {
    console.error("SDS SHEETS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load SDS sheets",
    });
  }
});

// ============================================================================
//  USERS (ASSIGN PAGE)
// ============================================================================
app.get("/users", async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const users = snap.docs.map(d => d.data());
    res.json({ ok: true, users });
  } catch (err) {
    console.error("USERS ERROR:", err);
    res.status(500).json({ ok: false });
  }
});



// ============================================================================
//  SDS ASSIGN (ASSIGN PAGE)
// ============================================================================
app.post("/sds/assign", async (req, res) => {
  try {
    console.log("ASSIGN BODY:", req.body);
    const { company, sheet, refIds, userId } = req.body;

    if (!sheet || !userId || !Array.isArray(refIds)) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const sheetId = normalize(sheet);
    const assignee = normalize(userId);

    const batch = db.batch();

    for (const r of refIds) {
      const refId = normalize(r);

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheetId)
        .collection("references")
        .doc(refId);

      batch.set(
        refDoc,
        {
          assignedTo: assignee,
          assignedAt: Date.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    res.json({ ok: true });
  } catch (err) {
    console.error("SDS ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// SDS BULK ASSIGN BY COMPANY (ADMIN)
// ============================================================================

app.post("/sds/assign/by-company", async (req, res) => {
  try {
    const { sheet, company, userId } = req.body;

    if (!sheet || !company || !userId) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const sheetId = normalize(sheet);
    const companyName = company.trim();
    const assignee = normalize(userId);

    const snap = await db
      .collection("sds_sheets")
      .doc(sheetId)
      .collection("references")
      .where("manufacturerName", "==", companyName)
      .where("assignedTo", "==", null)
      .get();

    if (snap.empty) {
      return res.json({ ok: true, assigned: 0 });
    }

    const batch = db.batch();
    let count = 0;

    snap.forEach(doc => {
      batch.set(
        doc.ref,
        {
          assignedTo: assignee,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          assignmentMode: "BULK_COMPANY",
        },
        { merge: true }
      );
      count++;
    });

    await batch.commit();

    res.json({ ok: true, assigned: count });
  } catch (err) {
    console.error("BULK ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});
// ============================================================================
// SDS REASSIGN (ADMIN ONLY)
// ============================================================================

app.post("/sds/reassign", async (req, res) => {
  try {
    const { sheet, refId, newUserId, reason } = req.body;

    if (!sheet || !refId || !newUserId) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const refDoc = db
      .collection("sds_sheets")
      .doc(normalize(sheet))
      .collection("references")
      .doc(normalize(refId));

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    await refDoc.set(
      {
        reassignedFrom: snap.data().assignedTo || null,
        assignedTo: normalize(newUserId),
        assignmentStatus: "REASSIGNED",
        reassignedAt: admin.firestore.FieldValue.serverTimestamp(),
        reassignReason: reason || "Admin reassignment",
      },
      { merge: true }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("REASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// ADMIN – LIST REFERENCES (SINGLE SOURCE OF TRUTH — FINAL + COMPANY + MANUFACTURER FILTER)
// ============================================================================

app.get("/admin/workflow/list", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const stage = req.query.stage;
    const company = req.query.company;
    const { repositoryNo } = req.query;
console.log("REPOSITORY SEARCH:", repositoryNo);
   
    let manufacturer = req.query.manufacturer;
    if (manufacturer && !Array.isArray(manufacturer)) {
      manufacturer = [manufacturer]; 
    }

    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);

    if ((!sheet && !repositoryNo) || !stage) {
      return res.json({ ok: false, rows: [], total: 0 });
    }

    let sheetDocs = [];

if (repositoryNo && !sheet) {
  const allSheets = await db.collection("sds_sheets").get();

  for (const sheetDoc of allSheets.docs) {
    const refs = await sheetDoc.ref
      .collection("references")
      .get();

    refs.forEach(doc => {
      sheetDocs.push({
        sheetName: sheetDoc.id,
        doc
      });
    });
  }
} else {
  const snap = await db
    .collection("sds_sheets")
    .doc(sheet)
    .collection("references")
    .get();

  snap.forEach(doc => {
    sheetDocs.push({
      sheetName: sheet,
      doc
    });
  });
}
  if (stage === "billing") {
  return res.json({
    ok: true,
    rows: [],
    total: 0,
  });
}

    const rows = [];

    
sheetDocs.forEach(({ sheetName, doc }) => {
 
  const d = doc.data();
 console.log(
  "DOC REPO:",
  d.common?.repositoryNumber
);
  const isAssignable =
    stage !== "billing" &&
    d.workflowStatus === "ASSIGN_PENDING" &&
    d.nextStage === stage;

  const isActiveStage =
    d.workflowStatus !== "ASSIGN_PENDING" &&
    d.currentStage === stage;

      if (!isAssignable && !isActiveStage) return;

      const businessEntity = d.common?.businessEntity || "";
      const manufacturerName = d.common?.manufacturerName || "";
      const repoNo = d.common?.repositoryNumber || "";
      if (
  repositoryNo &&
  !repoNo.toLowerCase().includes(repositoryNo.toLowerCase())
) {
  return;
}

     
      if (company && businessEntity !== company) return;

      
      if (
        manufacturer &&
        manufacturer.length &&
        !manufacturer.includes(manufacturerName)
      ) {
        return;
      }

      rows.push({
        sheetName,
        referenceId: d.referenceId || doc.id,
        repositoryNumber: repoNo,
        businessEntity,
        manufacturerName,
        chemicalProduct: d.common?.chemicalProduct || "",
        currentStage: d.currentStage || stage,
        assignedTo: d[stage]?.assignedTo || null,
        comments2: d.search?.comments2 || "",
        newRepositoryNumber:
    d.supersede?.newRepositoryNumber || "",
      });
    });

    const total = rows.length;

    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    return res.json({ ok: true, rows: paged, total });
  } catch (err) {
    console.error("ADMIN WORKFLOW LIST ERROR:", err);
    res.status(500).json({ ok: false, rows: [], total: 0 });
  }
});


// ============================================================================
// SDS LIST — SINGLE SOURCE OF TRUTH (USED BY ADMIN + USER)
// URL: /sds/list?sheet=TEST_4&page=1&pageSize=100
// ============================================================================

app.get("/sds/list", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);

    if (!sheet) {
      return res.status(400).json({
        ok: false,
        error: "Sheet missing",
      });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("referenceId")
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        referenceId: d.referenceId || doc.id,
        currentStage: d.currentStage || "search",
        assignedTo: d.assignedTo || null,
        workflowStatus: d.workflowStatus || "",

        search: d.search || null,
        supersede: d.supersede || null,
        transcription: d.transcription || null,
        billing: d.billing || null,
      };
    });

    const start = (page - 1) * pageSize;

    return res.json({
      ok: true,
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
    });
  } catch (err) {
    console.error("❌ SDS LIST ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load SDS list",
    });
  }
});

// ============================================================================
// EXPORT SDS DATABASE — CONTENT ONLY (NO STATUS / NO ASSIGNMENT)
// ============================================================================

app.get("/admin/sds/database/export", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) return res.status(400).end();

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const rows = snap.docs.map(doc => {
      const x = doc.data();

      return {
        /* ================= BASIC ================= */
        ReferenceID: doc.id,

        /* ================= COMMON ================= */
        BusinessEntity: x.common?.businessEntity || "",
        RepositoryNumber: x.common?.repositoryNumber || "",
        ChemicalProduct: x.common?.chemicalProduct || "",
        ManufacturerName: x.common?.manufacturerName || "",
        RevisionDate: x.common?.revisionDate || "",
        VerificationDate: x.common?.verificationDate || "",

        /* ================= SEARCH ================= */
        Search_Websearch1: x.search?.websearch1 || "",
        Search_Websearch2: x.search?.websearch2 || "",
        Search_Comments1: x.search?.comments1 || "",
        Search_Comments2: x.search?.comments2 || "",
        Search_Remarks: x.search?.remarks || "",
        Search_SupersedeObservation: x.search?.supersedeObservation || "",
        Search_StartDate: x.search?.startDate || "",
        Search_EndDate: x.search?.endDate || "",
        Search_NotPublishable: x.search?.notPublishable ? "YES" : "NO",
        Search_NotPublishableReason: x.search?.notPublishableRemarks || "",

        /* ================= SUPERSEDE ================= */
        Supersede_NewRepositoryNumber: x.supersede?.newRepositoryNumber || "",
        Supersede_Date: x.supersede?.supersedeDate || "",
        Supersede_VerifiedDate: x.supersede?.verifiedDate || "",
        Supersede_Comments1: x.supersede?.comments1 || "",
        Supersede_Comments2: x.supersede?.comments2 || "",
        Supersede_Remarks: x.supersede?.remarks || "",

        /* ================= TRANSCRIPTION ================= */
        Transcription_VerifiedDate: x.transcription?.verifiedDate || "",
        Transcription_Comments1: x.transcription?.comments1 || "",
        Transcription_Comments2: x.transcription?.comments2 || "",
        Transcription_Remarks: x.transcription?.remarks || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "SDS_DATABASE");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sheet}_SDS_DATABASE.xlsx`
    );
    res.send(buf);
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).end();
  }
});


// =======================================================
// SEARCH SUBMIT (USER) — FINAL & WORKING
// =======================================================
app.post(
  "/sds/workflow/search",
  upload.single("pdf"),
  async (req, res) => {
    try {
      const sheet = String(req.body.sheet || "").trim();
      const refId = String(req.body.refId || "").trim();
      const userId = String(req.body.userId || "").trim();

      if (!sheet || !refId || !userId) {
        return res.json({ ok: false, error: "Missing fields" });
      }

      /* ===== NOT PUBLISHABLE FLAG ===== */
      const notPublishable =
        req.body.notPublishable === "true" ||
        req.body.notPublishable === true;

      /* ===== PDF UPLOAD ===== */
      let pdfUrl = null;

      if (req.file) {
        const filePath = `sds/${sheet}/${refId}/search.pdf`;
        const file = bucket.file(filePath);

        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          resumable: false,
        });

        await file.makePublic();

        pdfUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      }

      /* ===== SEARCH DATA ===== */
      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const snap = await refDoc.get();
      const searchData = {
        searchType: req.body.searchType || "",
        websearch1: req.body.websearch1 || "",
        websearch2: req.body.websearch2 || "",
        mailId: req.body.mailId || "",
        comments1: req.body.comments1 || "",
        comments2: req.body.comments2 || "",
        remarks: req.body.remarks || "",
        supersedeObservation: req.body.supersedeObservation || "",
        startDate: req.body.startDate || "",
        endDate: req.body.endDate || "",

        notPublishable,
        notPublishableReason: notPublishable
          ? req.body.notPublishableReason || ""
          : "",

        pdfUrl,

        user: userId,

        status: "completed",

        completedBy: userId,
        completedStage: "search",

        completedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      };  


/* ===== DECIDE NEXT STAGE ===== */

let nextStage;
let workflowStatus = "ASSIGN_PENDING";
let assignedTo = null;
let holdUntil = null;

if (notPublishable) {
  nextStage = "transcription";
} else {
  nextStage = "supersede";
}

/* ===== SAVE TO FIRESTORE ===== */

await db
  .collection("sds_sheets")
  .doc(sheet)
  .collection("references")
  .doc(refId)
  .set(
    {
      search: searchData,

      currentStage: nextStage,
      workflowStatus,
      assignedTo,

      nextStage,
      holdUntil,

      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

return res.json({
  ok: true,
  nextStage,
});

} catch (err) {
  console.error("SEARCH SUBMIT ERROR:", err);
  return res.status(500).json({ ok: false });
}
});

// ============================================================================
// SUPERSEDE STAGE SUBMIT (USER) — PDF ENABLED, PROD SAFE
// ============================================================================

app.post(
  "/sds/workflow/supersede",
  upload.single("pdf"), // ✅ ENABLE FILE UPLOAD
  async (req, res) => {
    try {
      const sheet = String(req.body.sheet || "").trim();
      const refId = String(req.body.refId || "").trim();
      const userId = String(req.body.userId || "").trim();

      if (!sheet || !refId || !userId) {
        return res.json({ ok: false, error: "Missing required fields" });
      }

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const snap = await refDoc.get();
      if (!snap.exists) {
        return res.json({ ok: false, error: "Reference not found" });
      }

      if (snap.data()?.supersede?.status === "completed") {
        return res.json({
          ok: false,
          error: "Supersede already completed",
        });
      }

      /* ================= PDF UPLOAD ================= */
      let pdfUrl = null;

      if (req.file) {
        const filePath = `sds/${sheet}/${refId}/supersede.pdf`;
        const file = bucket.file(filePath);

        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          resumable: false,
        });

       await file.makePublic();

      pdfUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      }

      /* ================= SUPERSEDE DATA ================= */
      const supersedeData = {
        newRepositoryNumber: req.body.newRepositoryNumber || "",
        supersedeDate: req.body.supersedeDate || "",
        verifiedDate: req.body.verifiedDate || "",
        comments1: req.body.comments1 || "",
        comments2: req.body.comments2 || "",
        remarks: req.body.remarks || "",
        remarks1: req.body.remarks1 || "",
        remarks2: req.body.remarks2 || "",

        pdfUrl, 

        user: userId,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await refDoc.set(
      {
        supersede: supersedeData,

        referencePdfUrl:
          pdfUrl || admin.firestore.FieldValue.delete(),

        workflowStatus: "ASSIGN_PENDING",

        currentStage: "transcription",

        nextStage: "transcription",

        assignedTo: null,

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
      );
      return res.json({
        ok: true,
        nextStage: "transcription",
      });
       } catch (err) {
      console.error("SEARCH SUBMIT ERROR:", err);
      return res.status(500).json({ ok: false });
    }
  }
);


// ============================================================================
// TRANSCRIPTION SUBMIT — FINAL (SEND TO BILLING)
// ============================================================================
app.post(
  "/sds/workflow/transcription",
  upload.none(),
  async (req, res) => {
    try {
      const sheet = String(req.body.sheet || "").trim();
      const refId = String(req.body.refId || "").trim();
      const userId = String(req.body.userId || "").trim();

      if (!sheet || !refId || !userId) {
        return res.json({
          ok: false,
          error: "Missing required fields",
        });
      }

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const snap = await refDoc.get();
      if (!snap.exists) {
        return res.json({ ok: false, error: "Reference not found" });
      }

      if (snap.data()?.transcription?.status === "completed") {
        return res.json({
          ok: false,
          error: "Transcription already completed",
        });
      }

      const transcriptionData = {
        verifiedDate: req.body.verifiedDate || "",
        comments1: req.body.comments1 || "",
        comments2: req.body.comments2 || "",
        remarks: req.body.remarks || "",
        remarks1: req.body.remarks1 || "",
        remarks2: req.body.remarks2 || "",
        user: userId,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedBy: userId,
        completedStage: "transcription"
      };

      await refDoc.set(
        {
          transcription: transcriptionData,

         
          billing: {
            status: "ready",
            readyAt: admin.firestore.FieldValue.serverTimestamp(),
          },

          currentStage: "billing",
          workflowStatus: "BILLING_READY", 
          nextStage: null,
          assignedTo: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        nextStage: "billing",
      });
    } catch (err) {
      console.error("❌ TRANSCRIPTION SUBMIT ERROR:", err);
      return res.status(500).json({
        ok: false,
        error: "Transcription submit failed",
      });
    }
  }
);


// ===================================================================
// USER: LOAD SDS WORKFLOW — FINAL FIX
// ===================================================================
app.get("/user/workflow/:sheet/:refId", async (req, res) => {
  try {
    const sheet = normalize(req.params.sheet); 
    const refId = req.params.refId;             

    const doc = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId)
      .get();

    if (!doc.exists) {
      console.log("❌ REF NOT FOUND:", sheet, refId);
      return res.json({ ok: false, error: "Reference not found" });
    }

    res.json({ ok: true, workflow: doc.data() });
  } catch (err) {
    console.error("USER WORKFLOW LOAD ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ===================================================================
// USER: GET ASSIGNED SDS TASKS — FINAL & CORRECT
// ===================================================================
app.get("/user/sds-tasks", async (req, res) => {
  try {
    let { userId } = req.query;
    if (!userId) return res.json({ ok: true, tasks: [] });

    userId = userId.trim().toUpperCase();
    const tasks = [];

    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheet = sheetDoc.id;

      const refsSnap = await sheetDoc.ref
        .collection("references")
        .get();

      refsSnap.forEach(refDoc => {
        const d = refDoc.data();
        const stage = d.currentStage || "search";

        const stageBlock = d[stage];

        if (
          stageBlock &&
          stageBlock.assignedTo &&
          stageBlock.assignedTo.toUpperCase() === userId
        ) {
          const common = d.common || {};

        tasks.push({
            company: "SARN",
            sheet,
            referenceId: refDoc.id,
            stage,
            status: stageBlock.status || "pending",

            revisionDate: common.revisionDate || "",
            verificationDate: common.verificationDate || "",
          });
        }
      });
    }

    console.log("✅ USER TASKS:", tasks);
    res.json({ ok: true, tasks });
  } catch (err) {
    console.error("USER SDS TASK ERROR:", err);
    res.status(500).json({ ok: false, tasks: [] });
  }
});

// ===================================================================
// WORKFLOW DETAILS — SINGLE SOURCE OF TRUTH (ADMIN + USER)
// ===================================================================
app.get("/workflow/details", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const refId = normalize(req.query.refId);

    if (!sheet || !refId) {
      return res.status(400).json({
        ok: false,
        error: "Missing sheet or refId",
      });
    }

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();

    if (!snap.exists) {
      return res.status(404).json({
        ok: false,
        error: "Reference not found",
      });
    }

    const d = snap.data();
    const currentStage = d.currentStage || "search";

    res.json({
      ok: true,
      workflow: {
        referenceId: d.referenceId || refId,
        sheet,

      
        common: d.common || {},

     
        currentStage,
        workflowStatus: d.workflowStatus || "IN_PROGRESS",
        nextStage: d.nextStage || null,

       
        assignedTo: d[currentStage]?.assignedTo || null,

      
        search: d.search || { status: "waiting" },
        supersede: d.supersede || { status: "waiting" },
        transcription: d.transcription || { status: "waiting" },
        billing: d.billing || { status: "waiting" },

      
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      },
    });
  } catch (err) {
    console.error("WORKFLOW DETAILS ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load workflow",
    });
  }
});


// ============================================================================
// USER WORKFLOW — LOAD BY referenceId ONLY (FINAL FIX)
// Used by WorkflowUserView.jsx
// ============================================================================

app.get("/user/work/:refId", async (req, res) => {
  try {
    const refId = normalize(req.params.refId);

    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const refSnap = await sheetDoc.ref
        .collection("references")
        .doc(refId)
        .get();

      if (refSnap.exists) {
        const d = refSnap.data();

        return res.json({
          ok: true,
          workflow: {
            referenceId: refId,
            sheet: sheetDoc.id,
            common: d.common || {},
            currentStage: d.currentStage || "search",

            search: d.search || {},
            supersede: d.supersede || {},
            transcription: d.transcription || {},
            billing: d.billing || {},

            assignedTo:
              d[d.currentStage]?.assignedTo || null,

            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          },
        });
      }
    }

    return res.json({ ok: false, error: "Reference not found" });
  } catch (err) {
    console.error("USER WORK LOAD ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

//sds completed work
app.get("/user/completed-sds-tasks", async (req, res) => {
  try {
    let { userId } = req.query;

    userId = String(userId || "")
      .trim()
      .toUpperCase();

    const tasks = [];

    const sheetsSnap =
      await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheet = sheetDoc.id;

      const refsSnap = await sheetDoc.ref
        .collection("references")
        .get();

      refsSnap.forEach((doc) => {
        const d = doc.data();

        const search = d.search || {};
        const supersede = d.supersede || {};
        const transcription = d.transcription || {};

        if (
          search.completedBy === userId ||
          supersede.completedBy === userId ||
          transcription.completedBy === userId
        ) {
          tasks.push({
            referenceId: doc.id,
            company: "SARN",
            sheet,
            stage: d.currentStage || "search",
            status: "completed",
          });
        }
      });
    }

    return res.json({
      ok: true,
      tasks,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
    });
  }
});

// ============================================================================
// ADMIN WORKFLOW ASSIGN (ONLY PLACE THAT MOVES STAGE)
// Admin assigns user for next stage
// ============================================================================

app.post("/admin/workflow/assign", async (req, res) => {
  try {
    const { sheet, refId, stage, userId } = req.body;
    if (stage === "billing") {
  return res.json({
    ok: false,
    error: "Billing cannot be assigned",
  });
}

    if (!sheet || !refId || !stage || !userId) {
      return res.json({ ok: false, error: "Missing required fields" });
    }

    const sheetId = normalize(sheet);
    const referenceId = normalize(refId);

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(referenceId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const d = snap.data();

    if (d?.[stage]?.status === "completed") {
      return res.json({
        ok: false,
        error: `${stage} already completed`,
      });
    }

    await refDoc.set(
      {
        currentStage: stage,
        workflowStatus: "IN_PROGRESS",

       
        nextStage: null,

        [stage]: {
        status: "pending",
        assignedTo: userId,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      },

        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("ADMIN ASSIGN ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});



// ============================================================================
// ADMIN – BULK ASSIGN WORKFLOW STAGE
// ============================================================================

app.post("/admin/workflow/assign-bulk", async (req, res) => {
  try {
    const { sheet, refIds, stage, userId } = req.body;
    if (stage === "billing") {
  return res.json({
    ok: false,
    error: "Billing cannot be assigned",
  });
}

    if (!sheet || !refIds || !stage || !userId) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const batch = db.batch();

    refIds.forEach(refId => {
      const refDoc = db
        .collection("sds_sheets")
        .doc(normalize(sheet))
        .collection("references")
        .doc(normalize(refId));

      batch.set(
        refDoc,
        {
          currentStage: stage,
          workflowStatus: "IN_PROGRESS",

          nextStage: null,

          [stage]: {
          status: "pending",
          assignedTo: userId,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        },

          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    res.json({ ok: true });
  } catch (err) {
    console.error("BULK ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});
function extractContentOnly(ref) {
  return {
    /* ================= COMMON ================= */
    ...ref.common,

    /* ================= SEARCH ================= */
    ...(ref.search ? {
      search_websearch1: ref.search.websearch1 || "",
      search_websearch2: ref.search.websearch2 || "",
      search_comments1: ref.search.comments1 || "",
      search_comments2: ref.search.comments2 || "",
      search_remarks: ref.search.remarks || "",
      search_supersedeObservation: ref.search.supersedeObservation || "",
      search_startDate: ref.search.startDate || "",
      search_endDate: ref.search.endDate || "",
    } : {}),

    /* ================= SUPERSEDE ================= */
    ...(ref.supersede && ref.supersede.status === "completed" ? {
      supersede_newRepositoryNumber: ref.supersede.newRepositoryNumber || "",
      supersede_supersedeDate: ref.supersede.supersedeDate || "",
      supersede_verifiedDate: ref.supersede.verifiedDate || "",
      supersede_comments1: ref.supersede.comments1 || "",
      supersede_comments2: ref.supersede.comments2 || "",
      supersede_remarks: ref.supersede.remarks || "",
    } : {}),

    /* ================= TRANSCRIPTION ================= */
    ...(ref.transcription && ref.transcription.status === "completed" ? {
      transcription_verifiedDate: ref.transcription.verifiedDate || "",
      transcription_comments1: ref.transcription.comments1 || "",
      transcription_comments2: ref.transcription.comments2 || "",
      transcription_remarks: ref.transcription.remarks || "",
    } : {}),
  };
}
// =====================================================
// UPDATE STATUS (SEARCH STAGE ONLY)
// =====================================================
app.post("/sds/workflow/update-status", async (req, res) => {
  console.log("NEW UPDATE STATUS ROUTE V2");
  try {
    const sheet = String(req.body.sheet || "").trim();
    const refId = String(req.body.refId || "").trim();
    const userId = String(req.body.userId || "").trim();
    const status = String(req.body.status || "").trim();
    console.log("================================");
    console.log("UPDATE STATUS ROUTE HIT");
    console.log("BODY:", JSON.stringify(req.body, null, 2));
    console.log("================================");

    if (!sheet || !refId || !userId || !status) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const data = snap.data();

const updatedSearch = {
  ...(data.search || {}),

  status,

  searchType: req.body.searchType || "",
  comments1: req.body.comments1 || "",
  comments2: req.body.comments2 || "",

  websearch1: req.body.websearch1 || "",
  websearch2: req.body.websearch2 || "",
  websearch3: req.body.websearch3 || "",

  mailId: req.body.mailId || "",

  remarks: req.body.remarks || "",

  supersedeObservation:
    req.body.supersedeObservation || "",

  startDate: req.body.startDate || "",
  endDate: req.body.endDate || "",

  notPublishable:
    req.body.notPublishable === true ||
    req.body.notPublishable === "true",

  draftSaved: true,

  statusUpdatedBy: userId,
  statusUpdatedAt:
    admin.firestore.FieldValue.serverTimestamp(),
};
console.log(
  "UPDATED SEARCH:",
  JSON.stringify(updatedSearch, null, 2)
);

await refDoc.set(
  {
    search: updatedSearch,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  { merge: true }
);

    return res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

// =====================================================
// SDS Billing
// =====================================================
app.post("/sds/workflow/billing", async (req, res) => {
  try {
    const { sheet, refId, adminId } = req.body;

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    await refDoc.set(
      {
        billing: {
          status: "completed",
          completedBy: adminId,
          completedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },

        workflowStatus: "COMPLETED",
        currentStage: "completed",
        nextStage: null,
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
});



// =====================================================
//                DQ Module
// =====================================================

// =====================================================
// DQ UPLOAD – EXCEL → FIRESTORE (FIXED)
// =====================================================
// ======================= DQ UPLOAD (CRASH-PROOF) =======================
app.post("/dq/upload", upload.single("file"), async (req, res) => {
  try {
    const rawSheet = req.body.sheet;
    if (!rawSheet) return errJson(res, "Sheet required", 400);
    if (!req.file) return errJson(res, "File required", 400);

    const sheet = normalizeSheetName(rawSheet);

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) return errJson(res, "Empty Excel", 400);

    const refCol = db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references");

    const batch = db.batch();
    let added = 0;

    for (const row of rows) {
      const repoId = String(
        row["SDS #"] ||
        row["SDS#"] ||
        row["Repo ID"] ||
        Object.values(row)[0] ||
        ""
      )
        .trim()
        .toUpperCase(); 

      if (!repoId) continue;

      const docRef = refCol.doc(repoId);

      batch.set(docRef, {
        repoId,
        common: {
          sdsNumber: repoId,
          chemicalProduct:
            row["Chemical Product / Cost Apportionment"] ||
            row["Chemical Product"] ||
            "",
          manufacturer: row["Manufacturer"] || "",
          revisionDate: row["Revision Date"] || "",
          language: row["Language"] || "",
          sdsStatus: row["SDS Status"] || "",
          lastUpdatedDate: row["Last Updated Date"] || "",
          daysInQueue: row["Days in Queue"] || "",
          sitesInUse: row["Sites In Use"] || "",
          supersede: row["Supersede"] || "",
        },
        assignedTo: "",
        status: "pending",
        billingReady: false,
        currentStage: "transcription",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      added++;
    }

    if (added > 0) await batch.commit();

    await db
      .collection("dq_sheets")
      .doc(sheet)
      .set({ createdAt: Date.now() }, { merge: true });

    return res.json({ ok: true, added });
  } catch (err) {
    console.error("🔥 DQ UPLOAD CRASH:", err);
    return errJson(res, err.message || "Upload failed");
  }
});

// =====================================================
// DQ ASSIGN — HARD LOCK (FINAL)
// =====================================================
app.post("/dq/assign", async (req, res) => {
  try {
    const { sheet, repoId, userId } = req.body;

    if (!sheet || !repoId || !userId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const sheetId = sheet.toUpperCase();
    const refId = String(repoId).trim();

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "Repo not found" });
    }

    const data = snap.data();

   
    if (data.assignedTo) {
      return res.json({
        ok: false,
        error: "Already assigned",
      });
    }

    await refDoc.update({
      assignedTo: userId,
      assignedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ ASSIGN ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// DQ REASSIGN — ADMIN OVERRIDE (HOLIDAY / EMERGENCY)
// =====================================================
app.post("/dq/reassign", async (req, res) => {
  try {
    const { sheet, repoId, newUserId, reason } = req.body;

    if (!sheet || !repoId || !newUserId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const sheetId = sheet.toUpperCase();
    const refId = String(repoId).trim();

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "Repo not found" });
    }

    const prevUser = snap.data().assignedTo || null;

    await refDoc.update({
      assignedTo: newUserId,
      reassignedFrom: prevUser,
      reassignedAt: Date.now(),
      reassignReason: reason || "Admin reassignment",
      assignmentStatus: "REASSIGNED",
      updatedAt: Date.now(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ REASSIGN ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});


// =====================================================
// ADMIN – DQ WORKFLOW (FINAL FIXED)
// =====================================================
app.get("/admin/dq/workflow", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

   
    let all = snap.docs.map(doc => {
      const x = doc.data();
      const assignedTo = x.assignedTo || "";
      const billingReady = x.billingReady === true;

      let status = "unassigned";
      if (billingReady) status = "completed";
      else if (assignedTo) status = "assigned";

      return {
        repoId: x.repoId || doc.id, 
        stage: x.currentStage || "transcription",
        assignedTo,
        status,
        billingReady,
      };
    });

    const total = all.length;

   
    const start = (page - 1) * pageSize;
    const rows = all.slice(start, start + pageSize);

    res.json({
      ok: true,
      rows,
      total,
    });
  } catch (err) {
    console.error("ADMIN DQ WORKFLOW ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// ADMIN – FORCE MOVE TO BILLING (BULLETPROOF)
// =====================================================
app.post("/admin/dq/force-complete", async (req, res) => {
  try {
    const { sheet, repoId } = req.body;

    if (!sheet || !repoId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const sheetKey = String(sheet).trim().toUpperCase();
    const repoKey = String(repoId).trim();

  
    const snap = await db
      .collection("dq_sheets")
      .doc(sheetKey)
      .collection("references")
      .where("repoId", "==", repoKey)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.json({ ok: false, error: "DQ record not found" });
    }

    const docRef = snap.docs[0].ref;

    await docRef.update({
      assignedTo: "__FORCE_BILLED__",    
      currentStage: "force_billed",       
      billingReady: true,                
      billingForced: true,
      billingForcedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ FORCE COMPLETE ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// DQ LIST – DATABASE / ASSIGN / LIST (EXTENDED)
// =====================================================
app.get("/dq/list", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);
    const search = String(req.query.search || "").trim().toUpperCase();
    const filter = String(req.query.filter || "ALL").toUpperCase();

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

  
    let all = snap.docs.map(doc => {
      const x = doc.data();

      const isForceBilled = x.assignedTo === "__FORCE_BILLED__";

      const billingReady =
        x.billingReady === true ||
        x.billing?.ready === true;

      return {
        repoId: x.repoId || doc.id,

      
        stage: isForceBilled
          ? "force_billed"
          : x.currentStage || "transcription",

        assignedTo: x.assignedTo || "",

      
        locked: Boolean(x.assignedTo),

        billingReady,
      };
    });

  
    if (search) {
      all = all.filter(r =>
        String(r.repoId).toUpperCase().includes(search)
      );
    }

   
    if (filter === "ASSIGNED") {
      all = all.filter(r => r.locked);
    } else if (filter === "UNASSIGNED") {
      all = all.filter(r => !r.locked);
    } else if (filter === "READY") {
      all = all.filter(r => r.billingReady);
    }

    const total = all.length;

   
    const start = (page - 1) * pageSize;
    const rows = all.slice(start, start + pageSize);

    res.json({
      ok: true,
      rows,
      total,
    });
  } catch (err) {
    console.error("DQ LIST ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// DQ EXPORT – ONLY COMMON + USER WORK (STRICT HEADERS)
// =====================================================
app.get("/dq/export", async (req, res) => {
  try {
    if (!req.query.sheet) {
      return res.status(400).json({ ok: false, error: "Sheet required" });
    }

    const sheet = req.query.sheet.toUpperCase();

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    if (snap.empty) {
      return res.status(404).json({ ok: false, error: "No records found" });
    }

    
    const HEADERS = [
      "SDS #",
      "Chemical Product",
      "Manufacturer",
      "Revision Date",
      "Language",
      "SDS Status",
      "Days in Queue",
      "Sites In Use",
      "Supersede",

      "Completed By",
      "Date Verified",
      "Remarks"
    ];

    /* 🔁 BUILD ROWS – NO EXTRA KEYS ALLOWED */
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      const c = d.common || {};
      const w = d.userWork || {};

      const row = {
        "SDS #": c.sdsNumber || d.repoId || "",
        "Chemical Product": c.chemicalProduct || "",
        "Manufacturer": c.manufacturer || "",
        "Revision Date": c.revisionDate || "",
        "Language": c.language || "",
        "SDS Status": c.sdsStatus || "",
        "Days in Queue": c.daysInQueue || "",
        "Sites In Use": c.sitesInUse || "",
        "Supersede": c.supersede || "",
        "Completed By": w.completedBy || "",
        "Date Verified": w.dateVerified || "",
        "Comments": w.comments1 || "",
        "Comments 2": w.comments2 || "",

        "Remarks": w.remarks || ""
      };

      /* 🚫 HARD FILTER – REMOVE ANY UNWANTED KEYS */
      return HEADERS.reduce((acc, key) => {
        acc[key] = row[key] || "";
        return acc;
      }, {});
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DQ_WORKFLOW");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="DQ_WORKFLOW_${sheet}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);

  } catch (err) {
    console.error("DQ EXPORT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});



// =====================================================
// DQ BILLING – BACKEND (FINAL & NORMALIZED)
// =====================================================
app.get("/dq/billing", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }


    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      const common = d.common || {};

 
      const billingReady =
        d.billingReady === true ||
        d.billing?.ready === true;

      return {
        repoId: d.repoId || doc.id,
        chemicalProduct: common.chemicalProduct || "",
        manufacturer: common.manufacturer || "",
        billingReady,
      };
    });

    return res.json({
      ok: true,
      rows,
      total: rows.length,
    });
  } catch (err) {
    console.error("DQ BILLING ERROR:", err);
    return res.json({
      ok: false,
      error: err.message,
    });
  }
});



// =====================================================
// USER – LOAD DQ REFERENCES (ASSIGNED WORK) ✅ FIXED
// =====================================================
app.get("/dq/references", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

    const references = snap.docs.map(doc => {
      const d = doc.data();

      return {
        referenceId: d.repoId,
        currentStage: d.currentStage || "transcription",
        common: d.common || {},

        
        dq: {
          transcription: {
            data: {
              completedByName: d.completedByName || "",
              dateVerified: d.dateVerified || "",
              issueIdentified: d.issueIdentified || "",
              remarks1: d.remarks1 || "",
              billing: d.billing || "",
            },
          },
        },
      };
    });

    res.json({ ok: true, references });
  } catch (err) {
    console.error("DQ REFERENCES ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});
// =====================================================
// USER – LOAD SINGLE DQ WORKFLOW (FINAL)
// =====================================================
app.get("/user/dq/workflow", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const repoId = String(req.query.repoId || "").trim();
    const userId = String(req.query.userId || "").trim();

    if (!sheet || !repoId || !userId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .where("repoId", "==", repoId)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.json({ ok: false, error: "DQ reference not found" });
    }

    const doc = snap.docs[0];
    const d = doc.data();

    if (d.assignedTo !== userId) {
      return res.json({ ok: false, error: "Access denied" });
    }

    res.json({
      ok: true,
      reference: {
        referenceId: d.repoId,
        currentStage: d.currentStage || "transcription",
        common: d.common || {},

        dq: {
          transcription: {
            data: {
              completedByName: d.completedByName || "",
              dateVerified: d.dateVerified || "",
              issueIdentified: d.issueIdentified || "",
              remarks1: d.remarks1 || "",
              billing: d.billing || "",
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("USER DQ WORKFLOW ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});


// =====================================================
// USER – SAVE DQ WORK (TRANSCRIPTION → BILLING)
// =====================================================
app.post("/dq/work", async (req, res) => {
  try {
    const { sheet, repoId, userId, payload } = req.body;

    if (!sheet || !repoId || !userId || !payload) {
      return res.json({ ok: false, error: "Missing data" });
    }

    const sheetId = sheet.toUpperCase();
    const refId = repoId.toUpperCase();

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "DQ reference not found" });
    }

    const d = snap.data();


    if (d.assignedTo !== userId) {
      return res.json({ ok: false, error: "Access denied" });
    }

    await refDoc.update({
      completedByName: userId,
      dateVerified: payload.dateVerified || "",
      issueIdentified: payload.issueIdentified || "",
      remarks1: payload.remarks || "",
      currentStage: "billing",
      billingReady: true,
      updatedAt: Date.now(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("DQ WORK SAVE ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// USER – MY DQ TASKS (FINAL – HIDE COMPLETED)
// =====================================================
app.get("/user/dq-tasks", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();

    if (!userId) {
      return res.json({ ok: false, error: "UserId required" });
    }

    const tasks = [];

    const sheetsSnap = await db.collection("dq_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id;

      const refsSnap = await sheetDoc.ref
        .collection("references")
        .get();

      refsSnap.forEach(refDoc => {
        const d = refDoc.data();

      
        if (d.assignedTo !== userId) return;
        if (d.billingReady === true) return; 

        tasks.push({
          sheet: sheetId,
          repoId: d.repoId || refDoc.id,
          status: "assigned",
          assignedTo: d.assignedTo,
        });
      });
    }

    return res.json({
      ok: true,
      tasks,
      total: tasks.length,
    });
  } catch (err) {
    console.error("USER DQ TASKS ERROR:", err);
    return res.json({
      ok: false,
      error: "Failed to load user DQ tasks",
    });
  }
});

// =====================================================
// USER – LOAD DQ REPO (READ ONLY) ✅ FIXED
// =====================================================
app.get("/dq/load-repos", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

    const repos = snap.docs.map(doc => {
      const d = doc.data();
      const c = d.common || {};

      return {
        repoId: d.repoId,
        sdsNumber: c.sdsNumber || "",
        chemicalProduct: c.chemicalProduct || "",
        manufacturer: c.manufacturer || "",
        revisionDate: c.revisionDate || "",
        language: c.language || "",
        sdsStatus: c.sdsStatus || "",
        lastUpdatedDate: c.lastUpdatedDate || "",
        daysInQueue: c.daysInQueue || "",
        sitesInUse: c.sitesInUse || "",
        supersede: c.supersede || "",
      };
    });

    res.json({ ok: true, repos });
  } catch (err) {
    console.error("DQ LOAD REPOS ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// USER – SUBMIT DQ WORK (FINAL, SINGLE SOURCE)
// =====================================================
app.post("/dq/update", async (req, res) => {
  try {
    const { sheet, repoId, updates } = req.body;

    if (!sheet || !repoId || !updates) {
      return errJson(res, "Missing data", 400);
    }

    const sheetId = normalizeSheetName(sheet);
    const refId = String(repoId).trim().toUpperCase(); 

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      console.log("❌ DQ ref not found:", sheetId, refId);
      return errJson(res, "DQ reference not found", 404);
    }

    await refDoc.set(
      {
        userWork: {
          completedBy: updates.assignedTo,
          dateVerified: updates.dateVerified || "",
          issueIdentified: updates.issueIdentified || "",
          remarks: updates.remarks || "",
        },
        assignedTo: updates.assignedTo,
        currentStage: "billing",
        billingReady: true,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    console.log("✅ DQ updated:", refId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ UPDATE ERROR:", err);
    return errJson(res, err.message);
  }
});
// ======================= DQ SHEETS LIST (REQUIRED FOR DROPDOWN) =======================
app.get("/dq/sheets", async (req, res) => {
  try {
    const snap = await db.collection("dq_sheets").get();
    const sheets = snap.docs.map(doc => doc.id);

    return res.json({
      ok: true,
      sheets
    });
  } catch (err) {
    console.error("DQ SHEETS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load DQ sheets"
    });
  }
});

// =====================================================
// ADMIN – VIEW COMPLETED DQ WORK (CLEAN)
// =====================================================
app.get("/admin/dq/view", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const repoId = String(req.query.repoId || "").trim().toUpperCase();

    if (!sheet || !repoId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const docRef = db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .doc(repoId);

    const snap = await docRef.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "DQ reference not found" });
    }

    const d = snap.data();

    res.json({
      ok: true,
      data: {
        repoId: d.repoId,
        common: d.common || {},
        userWork: d.userWork || {},   
      },
    });
  } catch (err) {
    console.error("ADMIN DQ VIEW ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});


const PORT = process.env.PORT || 8080;


const cron = require("node-cron");


cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Running SDS Reminder Job...");

  try {
    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const refsSnap = await sheetDoc.ref
        .collection("references")
        .where("workflowStatus", "==", "IN_PROGRESS")
        .get();

      for (const doc of refsSnap.docs) {
        const data = doc.data();

        
        if (data.holdUntil && Date.now() > data.holdUntil) {
          console.log(
            `⏰ Reminder: ${data.referenceId} pending with ${data.assignedTo}`
          );

          await doc.ref.set(
            {
              reminder: {
                pending: true,
                lastReminderAt: new Date(),
              },
            },
            { merge: true }
          );
        }
      }
    }

    console.log("✅ Reminder Job Done");
  } catch (err) {
    console.error("❌ Reminder Error:", err);
  }
});

// ---------------- BATCH MODULE ----------------

// ============================================================================
// BATCH UPLOAD
// ============================================================================
function excelDateToJS(value) {
  if (!value) return "";

  if (typeof value === "number") {
    const date = new Date(
      Math.round((value - 25569) * 86400 * 1000)
    );

    return date.toISOString().split("T")[0];
  }

  return value;
}
//batch upload

app.post("/batch/upload", upload.single("file"), async (req, res) => {
  try {
    const sheet = normalize(req.body.sheet);

    if (!sheet || !req.file) {
      return res.json({
        ok: false,
        error: "Sheet and file required",
      });
    }

    const workbook = XLSX.read(
  req.file.buffer,
  {
    type: "buffer",
    cellStyles: true,
    cellHTML: true,
    cellFormula: true,
  }
);

    const ws =
      workbook.Sheets[workbook.SheetNames[0]];

    const rows =
      XLSX.utils.sheet_to_json(ws, {
        defval: "",
      });

    if (!rows.length) {
      return res.json({
        ok: false,
        error: "Empty Excel",
      });
    }
    const repoMap = {};
const duplicateRepos = new Set();

rows.forEach(row => {
  const repo = String(
    row["New Repository"] || ""
  ).trim();

  if (!repo) return;

  repoMap[repo] =
    (repoMap[repo] || 0) + 1;
});

Object.keys(repoMap).forEach(repo => {
  if (repoMap[repo] > 1) {
    duplicateRepos.add(repo);
  }
});

    await db
      .collection("batch_sheets")
      .doc(sheet)
      .set(
        {
          createdAt: Date.now(),
        },
        { merge: true }
      );

    let batch = db.batch();
let count = 0;
let ops = 0;

    for (let index = 0; index < rows.length; index++) {
  const row = rows[index];
  const repositoryNo = String(
  row["New Repository"] || ""
).trim();

const isDuplicate =
  duplicateRepos.has(
    repositoryNo
  );  

  const excelRow = index + 2;
  const siteSdsCell =
  ws[`F${excelRow}`]; // F = Site SDS # column

const siteSdsLink =
  siteSdsCell?.l?.Target || "";
      const recordId =
        "BATCH_" + String(count + 1).padStart(6, "0");

      const ref = db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .doc(recordId);

      batch.set(ref, {
        duplicate: isDuplicate,

        duplicateGroup:
          repositoryNo,
        recordId,

        common: {
          chemicalName:
            row["Chemical Name"] || "",

          manufacturerName:
            row["Manufacturer Name"] || "",

          revisionDate:
            excelDateToJS(
              row["Revision Date"]
            ),

          siteApprovalStatus:
            row["Site Approval Status"] || "",

          siteName:
            row["Site Name"] || "",

          siteSdsNumber:
            row["Site SDS #"] || "",

          siteSdsLink:
            siteSdsLink,

          manufacturerCountry:
            row["Manufacturer Country"] || "",

          language:
            row["Language"] || "",

          verifiedDate:
            excelDateToJS(
              row["Verified Date"]
            ),

          pdfUploaded:
            row["PDF Uploaded?"] || "",

          pdfQcStatus:
            row["Status (PDF QC Status)"] || "",

          newRepository:
            row["New Repository"] || "",

          productCode:
            row["Product Code"] || "",

          pdfFileName:
            row["PDF File Name"] || "",
        },

        verification: {
          status: "pending",
        },

        billing: {
          status: "waiting",
        },

        currentStage: "verification",

        workflowStatus:
          "ASSIGN_PENDING",

        nextStage:
          "verification",

        assignedTo: null,

        uploadedAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
      ops++;

if (ops >= 400) {
  await batch.commit();

  batch = db.batch();
  ops = 0;
}

      count++;
    }

    if (ops > 0) {
  await batch.commit();
}

    res.json({
  ok: true,
  count,
  duplicateCount:
    duplicateRepos.size,
});
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

//BATCH SHEETS LIST 

app.get("/batch/sheets", async (req, res) => {
  try {
    const snap =
      await db.collection("batch_sheets").get();

    const sheets =
      snap.docs.map(d => d.id);

    res.json({
      ok: true,
      sheets,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

//BATCH RECORDS LIST (FOR ADMIN VIEW)

  app.get("/admin/batch/list", async (req, res) => {
    try {
      const sheet =
        normalize(req.query.sheet);

      if (!sheet) {
        return res.json({
          ok: true,
          rows: [],
        });
      }

      const snap = await db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .get();

      const rows = [];

      snap.forEach(doc => {
        const d = doc.data();
        console.log(
    "DEBUG_LANGUAGE",
    d.recordId,
    d.common?.language
  );

      rows.push({
    recordId: d.recordId,

    newRepository:
      d.common?.newRepository || "",

    chemicalName:
      d.common?.chemicalName || "",

    manufacturerName:
      d.common?.manufacturerName || "",
    
    language:
    d.common?.language || "",

    siteName:
      d.common?.siteName || "",

    revisionDate:
      d.common?.revisionDate || "",

    status:
      d.workflowStatus || "ASSIGN_PENDING",

    assignedTo:
      d.verification?.assignedTo || null,

    duplicate:
      d.duplicate || false,

    duplicateGroup:
      d.duplicateGroup || "",
  });
  console.log(
  "LANGUAGE =>",
  d.recordId,
  d.common?.language
);
      });

      res.json({
        ok: true,
        rows,
        total: rows.length,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  });

  //ASSIGN USER TO BATCH RECORD

  app.post("/admin/batch/assign", async (req, res) => {
    try {
      const {
        sheet,
        recordIds,
        userId,
      } = req.body;

      const batch = db.batch();

      for (const id of recordIds) {
        const ref = db
          .collection("batch_sheets")
          .doc(normalize(sheet))
          .collection("records")
          .doc(id);

        batch.set(
          ref,
          {
            workflowStatus:
              "IN_PROGRESS",

            verification: {
              status: "pending",
              assignedTo: userId,
              assignedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      }

      await batch.commit();

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  });

//BATCH LIST DETAILS 

app.get("/batch/details", async (req, res) => {
  try {
    const sheet =
      normalize(req.query.sheet);

    const recordId =
      req.query.recordId;

    const snap = await db
      .collection("batch_sheets")
      .doc(sheet)
      .collection("records")
      .doc(recordId)
      .get();

    if (!snap.exists) {
      return res.json({
        ok: false,
      });
    }

    res.json({
      ok: true,
      workflow: snap.data(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

//SUBMIT VERIFICATION

app.post(
  "/batch/workflow/verification",
  async (req, res) => {
    try {
      const {
        sheet,
        recordId,
        userId,

        dateVerified,
        issueIdentified,

        remarks1,
        remarks2,

        status,
      } = req.body;

      const ref = db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .doc(recordId);

      await ref.set(
        {
          verification: {
            verifiedBy: userId,

            dateVerified,

            issueIdentified,

            remarks1,

            remarks2,

            status,

            completedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          billing: {
            status: "ready",
          },

          currentStage:
            "billing",

          workflowStatus:
            "BILLING_READY",

          nextStage: null,
        },
        { merge: true }
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  }
);

//BILLING QUEUE LIST (FOR BILLING TEAM)

app.get("/admin/batch/billing", async (req, res) => {
  try {
    const sheet =
      normalize(req.query.sheet);

    const snap = await db
      .collection("batch_sheets")
      .doc(sheet)
      .collection("records")
      .where(
        "workflowStatus",
        "==",
        "BILLING_READY"
      )
      .get();

    const rows =
      snap.docs.map(d => d.data());

    res.json({
      ok: true,
      rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

//BILLING COMPLETE (MARK RECORD AS BILLED)

app.post(
  "/batch/workflow/billing",
  async (req, res) => {
    try {
      const {
        sheet,
        recordId,
        adminId,
      } = req.body;

      const ref = db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .doc(recordId);

      await ref.set(
        {
          billing: {
            status: "completed",

            completedBy:
              adminId,

            completedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          workflowStatus:
            "COMPLETED",

          currentStage:
            "completed",
        },
        { merge: true }
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  }
);

//BATCH EXPORT

app.get("/admin/batch/export", async (req, res) => {
  try {
    const sheet =
      normalize(req.query.sheet);

    const snap = await db
      .collection("batch_sheets")
      .doc(sheet)
      .collection("records")
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();

      return {
        ChemicalName:
          d.common?.chemicalName,

        ManufacturerName:
          d.common?.manufacturerName,

        RevisionDate:
          d.common?.revisionDate,

        SiteName:
          d.common?.siteName,

        SiteSDS:
          d.common?.siteSdsNumber,

        Language:
          d.common?.language,

        Repository:
          d.common?.newRepository,

        ProductCode:
          d.common?.productCode,

        PdfFile:
          d.common?.pdfFileName,

        DateVerified:
          d.verification?.dateVerified,

        IssueIdentified:
          d.verification?.issueIdentified,

        Remarks1:
          d.verification?.remarks1,

        Remarks2:
          d.verification?.remarks2,

        Status:
          d.verification?.status,

        BillingStatus:
          d.billing?.status,
      };
    });

    const wb =
      XLSX.utils.book_new();

    const ws =
      XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "BATCH_EXPORT"
    );

    const buf =
      XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
      });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sheet}_BATCH.xlsx`
    );

    res.send(buf);
  } catch (err) {
    res.status(500).end();
  }
});

//USER TASKS LIST 
app.get("/user/batch-tasks", async (req, res) => {
  try {
    const userId = String(
      req.query.userId || ""
    )
      .trim()
      .toUpperCase();

    const page =
  Number(req.query.page) || 1;

const pageSize =
  Number(req.query.pageSize) || 100;

const language =
  String(req.query.language || "")
    .trim();

const allTasks = [];
const languageSet =
  new Set();

    const sheets =
      await db.collection("batch_sheets").get();

    for (const sheetDoc of sheets.docs) {
      const records =
        await sheetDoc.ref
          .collection("records")
          .get();

     records.forEach(doc => {
  const d = doc.data();

  if (
    d.verification?.assignedTo?.toUpperCase() ===
    userId
  ) {

    // Collect only this user's languages
    if (d.common?.language) {
      languageSet.add(
        d.common.language
      );
    }
          // Language filter
          if (
            language &&
            d.common?.language !==
              language
          ) {
            return;
          }

          allTasks.push({
            sheet: sheetDoc.id,
            recordId: doc.id,

            newRepository:
              d.common?.newRepository || "",

            chemicalName:
              d.common?.chemicalName || "",
              
            language:
              d.common?.language || "",
              
            duplicate:
              d.duplicate || false,

            status:
              d.verification?.status ||
              "pending",
          });
        }
      });
    }

    // Counts
    const assigned =
      allTasks.length;

    const completed =
      allTasks.filter(
        t =>
          t.status
            ?.toLowerCase() ===
          "completed"
      ).length;

    const pending =
      assigned - completed;
      
    const pendingTasks =
      allTasks.filter(
      t =>
      t.status?.toLowerCase() !==
      "completed"
  );

    // Sort pending first
    allTasks.sort((a, b) => {
      if (
        a.status === "completed" &&
        b.status !== "completed"
      )
        return 1;

      if (
        a.status !== "completed" &&
        b.status === "completed"
      )
        return -1;

      return 0;
    });

    // Pagination
    const start =
      (page - 1) * pageSize;

    const end =
      start + pageSize;

    const tasks =
  pendingTasks.slice(start, end);

    res.json({
      ok: true,

      tasks,
      languages:
        [...languageSet].sort(),

      counts: {
        assigned,
        completed,
        pending,
      },

      pagination: {
      page,
      pageSize,
      total: pendingTasks.length,
      pages: Math.ceil(
        pendingTasks.length /
          pageSize
      ),
    },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      ok: false,
      message:
        "Failed to load tasks",
    });
  }
});

//Batch Completed

app.get("/user/batch/completed", async (req, res) => {
  try {
    const userId = String(
  req.query.userId || ""
)
  .trim()
  .toUpperCase();
  

const fromDate =
  req.query.fromDate || "";

const toDate =
  req.query.toDate || "";

const page =
  Number(req.query.page) || 1;

const pageSize =
  Number(req.query.pageSize) || 100;
 
const language =
  String(
    req.query.language || ""
  ).trim();

    const rows = [];
    let pendingAssigned = 0;

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    let completedToday = 0;
    let completedMonth = 0;

    const sheets = await db
      .collection("batch_sheets")
      .get();

    for (const sheetDoc of sheets.docs) {
      const records = await sheetDoc.ref
      .collection("records")
      .get();

      records.forEach(doc => {
  const d = doc.data();

  if (
  d.verification?.assignedTo
    ?.toUpperCase() !==
  userId
) {
  return;
}

  const status =
    d.verification?.status
      ?.toLowerCase() || "";

  // Count pending
  if (status !== "completed") {
    pendingAssigned++;
  }

  // Completed rows
  if (status === "completed") {
    const verifiedDate =
      d.verification?.dateVerified || "";
      if (
  fromDate &&
  verifiedDate < fromDate
) {
  return;
}

if (
  toDate &&
  verifiedDate > toDate
) {
  return;
}

    rows.push({
      sheet: sheetDoc.id,
      recordId: doc.id,

      newRepository:
        d.common?.newRepository || "",

      chemicalName:
        d.common?.chemicalName,

      manufacturerName:
        d.common?.manufacturerName,

      language:
        d.common?.language || "",

      siteName:
        d.common?.siteName,

      verifiedDate,
    });

    if (
      verifiedDate === today
    ) {
      completedToday++;
    }

    if (
      verifiedDate?.startsWith(
        today.slice(0, 7)
      )
    ) {
      completedMonth++;
    }
  }
});
    }
const start =
  (page - 1) * pageSize;

const end =
  start + pageSize;

const paginatedRows =
  rows.slice(start, end);
    res.json({
  ok: true,

  rows: paginatedRows,

  summary: {
    completedToday,
    completedMonth,
    pendingAssigned,
    totalCompleted:
      rows.length,
  },

  pagination: {
    page,
    pageSize,
    total: rows.length,
    pages: Math.ceil(
      rows.length / pageSize
    ),
  },
});
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

// ---------------- START ----------------
app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
