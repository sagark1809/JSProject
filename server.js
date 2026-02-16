const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

const usersFile = path.join(__dirname, "data", "users.json");
function ensureFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
}


/* =========================
   Helper Functions
========================= */

function readUsers() {
    //comment today
//     if (!fs.existsSync(usersFile)) {
//         fs.writeFileSync(usersFile, JSON.stringify([]));
//     }
//     const data = fs.readFileSync(usersFile);
//     return JSON.parse(data);
// }

// function writeUsers(users) {
//     fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
// function readUsers() {
    ensureFile(usersFile);

    let users = JSON.parse(fs.readFileSync(usersFile));

    // Check if admin exists
    const adminExists = users.some(u => u.role === "admin");

    if (!adminExists) {
        const defaultAdminPassword = bcrypt.hashSync("admin123", 10);

        const adminUser = {
            id: "admin-1",
            role: "admin",
            name: "System Admin",
            identifier: "admin",
            password: defaultAdminPassword,
            status: "approved"
        };

        users.push(adminUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        console.log("✅ Default admin created");
    }

    // return JSON.parse(fs.readFileSync(usersFile));
    return users;
}
function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}


/* =========================
   REGISTER (Company Only)
========================= */


// add async on line 41
app.post("/register", async(req, res) => {
    const { name, identifier, password, address, contact } = req.body;

    const users = readUsers();

    const existingUser = users.find(
        (user) => user.identifier === identifier
    );

    if (existingUser) {
        return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        role: "company",  // fixed role
        name,
        identifier,
        address,
        contact,
        password:hashedPassword,
        status: "pending"
    };

    users.push(newUser);
    writeUsers(users);

    res.json({ success: true });
});

/* =========================
   LOGIN (Company + Admin)
========================= */


//add async on line 77
app.post("/login", async(req, res) => {
    const { identifier, password } = req.body;

    const users = readUsers();

    // const user = users.find(
    //     (u) => u.identifier === identifier && u.password === password
    // );
    //add new today on line 87
const user = users.find(u => u.identifier === identifier);
    if (!user) {
        return res.json({ success: false, message: "Invalid credentials" });
    }

    if (user.role === "admin") {
        return res.json({
            success: true,
            role: "admin",
            status: "approved",
            //add 16
            user: user
        });
    }

    if (user.status === "pending") {
        return res.json({
            success: true,
            status: "pending",
            role: user.role,
            //add 16
            user: user
        });
    }

    if (user.status === "approved") {
        return res.json({
            success: true,
            status: "approved",
            role: user.role,
            //add 16
            user: user
        });
    }
});

/* =========================
   GET PENDING COMPANIES
========================= */

app.get("/admin/pending-users", (req, res) => {
    const users = readUsers();
    const pendingUsers = users.filter(
        user => user.role === "company" && user.status === "pending"
    );
    res.json(pendingUsers);
});

/* =========================
   APPROVE COMPANY
========================= */

app.post("/admin/approve-user", (req, res) => {
    const { id } = req.body;

    const users = readUsers();
    const user = users.find(u => String(u.id) === String(id));

    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    user.status = "approved";
    writeUsers(users);

    res.json({ success: true });
});

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

const productsFile = path.join(__dirname, "data", "products.json");
const ordersFile = path.join(__dirname, "data", "orders.json");

/* Get all products */
app.get("/products", (req, res) => {
    if (!fs.existsSync(productsFile)) {
        fs.writeFileSync(productsFile, JSON.stringify([]));
    }
    const products = JSON.parse(fs.readFileSync(productsFile));
    res.json(products);
});

app.get("/users", (req, res) => {
    const users = JSON.parse(fs.readFileSync(usersFile));
    res.json(users);
});


/* Place order */
app.post("/orders", (req, res) => {
    const { productId, quantity, identifier } = req.body;

    if (!fs.existsSync(ordersFile)) {
        fs.writeFileSync(ordersFile, JSON.stringify([]));
    }

    const products = JSON.parse(fs.readFileSync(productsFile));
    const orders = JSON.parse(fs.readFileSync(ordersFile));

    const product = products.find(p => p.id == productId);

    if (!product) {
        return res.json({ success: false, message: "Product not found" });
    }

    const newOrder = {
        id: Date.now(),
        companyIdentifier: identifier,
        productName: product.name,
        quantity,
        price: product.price,
        status: "Placed"
    };

    orders.push(newOrder);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

    res.json({ success: true });
});

/* Get company orders */
app.get("/orders/:identifier", (req, res) => {
    if (!fs.existsSync(ordersFile)) {
        fs.writeFileSync(ordersFile, JSON.stringify([]));
    }

    const orders = JSON.parse(fs.readFileSync(ordersFile));

    const companyOrders = orders.filter(
        o => o.companyIdentifier === req.params.identifier
    );

    res.json(companyOrders);
});

/* =========================
   PROFILE
========================= */

app.get("/profile/:identifier", (req, res) => {
    const users = readUsers();
    const user = users.find(u => u.identifier === req.params.identifier);
    res.json(user || {});
});
app.post("/update-profile", async(req, res) => {

    const {
        identifier,
        name,
        password,
        email,
        phone,
        address,
        businessType,
        description
    } = req.body;

    //comment today
    // const users = JSON.parse(fs.readFileSync(usersFile));
const users = readUsers();
    const user = users.find(u => u.identifier === identifier);

    if (!user) {
        return res.json({ success: false });
    }

    // Update fields
    user.name = name;
    //before 254-257
    if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = password;
    }
    user.email = email;
    user.phone = phone;
    user.address = address;
    user.businessType = businessType;
    user.description = description;

    //comment today
    // fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
writeUsers(users);
    res.json({ success: true });
});



// OTP - DONT KNOW 

// app.post("/forgot-password", (req, res) => {

//     const { identifier } = req.body;

//     const users = JSON.parse(fs.readFileSync("./data/users.json"));

//     const user = users.find(u => u.identifier === identifier);

//     if (!user) {
//         return res.json({ success: false, message: "User not found" });
//     }

//     // Generate 4-digit OTP
//     const otp = Math.floor(1000 + Math.random() * 9000).toString();

//     user.resetOtp = otp;

//     fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

//     console.log("OTP for", identifier, ":", otp); // For testing only

//     res.json({ success: true });
// });

// NEW FORGET PASSWORD
app.post("/forgot-password", (req, res) => {

    const { identifier } = req.body;

    const users = JSON.parse(fs.readFileSync("./data/users.json"));
    const smsLog = JSON.parse(fs.readFileSync("./data/sms-log.json"));

    const user = users.find(u => u.identifier === identifier);
    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    // 60 second cooldown
if (user.lastOtpRequest && Date.now() - user.lastOtpRequest < 60000) {
    return res.json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP."
    });
}


    // if (!user) {
    //     return res.json({ success: false, message: "User not found" });
    // }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes

    user.resetOtp = otp;
    user.otpExpiry = expiryTime;
    user.otpAttempts = 0;
    //add today
    user.lastOtpRequest = Date.now();


    fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

    // Simulated SMS message
    const smsMessage = {
        to: identifier,
        message: `Your FarmZY password reset OTP is ${otp}. It expires in 5 minutes.`,
        timestamp: new Date().toISOString()
    };

    smsLog.push(smsMessage);

    fs.writeFileSync("./data/sms-log.json", JSON.stringify(smsLog, null, 2));

    console.log("\n📩 ===== SIMULATED SMS SENT =====");
    console.log("To:", identifier);
    console.log("Message:", smsMessage.message);
    console.log("=================================\n");

    res.json({ success: true });
});




// VERIFY OTP
// app.post("/verify-reset-otp", (req, res) => {

//     const { identifier, otp } = req.body;

//     const users = JSON.parse(fs.readFileSync("./data/users.json"));
//     const user = users.find(u => u.identifier === identifier);

//     if (!user || user.resetOtp !== otp) {
//         return res.json({ success: false, message: "Invalid OTP" });
//     }

//     res.json({ success: true });
// });


app.post("/verify-reset-otp", (req, res) => {

    const { identifier, otp } = req.body;

    const users = JSON.parse(fs.readFileSync("./data/users.json"));
    const user = users.find(u => u.identifier === identifier);

    if (!user || !user.resetOtp) {
        return res.json({ success: false, message: "OTP not requested" });
    }

    // Check expiry
    if (Date.now() > user.otpExpiry) {
        delete user.resetOtp;
        delete user.otpExpiry;
        delete user.otpAttempts;

        fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

        return res.json({ success: false, message: "OTP expired" });
    }

    // Check attempts
    user.otpAttempts += 1;

    if (user.otpAttempts > 3) {
        delete user.resetOtp;
        delete user.otpExpiry;
        delete user.otpAttempts;

        fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

        return res.json({ success: false, message: "Too many attempts" });
    }

    if (user.resetOtp !== otp) {
        fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));
        return res.json({ success: false, message: "Invalid OTP" });
    }

    res.json({ success: true });
});







// add async on line 416

app.post("/reset-password", async(req, res) => {

    const { identifier, newPassword } = req.body;

    const users = JSON.parse(fs.readFileSync("./data/users.json"));
    const user = users.find(u => u.identifier === identifier);

    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
// user.password = hashedPassword;

    delete user.resetOtp;

    fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

    res.json({ success: true });
});








app.get("/get-profile/:identifier", (req, res) => {

    const identifier = req.params.identifier;

    const users = JSON.parse(fs.readFileSync("./data/users.json"));

    const user = users.find(u => u.identifier === identifier);

    if (!user) {
        return res.json({ success: false });
    }

    res.json({ success: true, user });
});




//add today
// Auto-clean expired OTPs every 60 seconds
setInterval(() => {

    const users = JSON.parse(fs.readFileSync("./data/users.json"));
    let updated = false;

    users.forEach(user => {
        if (user.otpExpiry && Date.now() > user.otpExpiry) {
            delete user.resetOtp;
            delete user.otpExpiry;
            delete user.otpAttempts;
            updated = true;
        }
    });

    if (updated) {
        fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));
        console.log("🧹 Expired OTPs cleaned automatically");
    }

}, 60000);









// Company Transaction History
app.get("/company/transactions/:companyId", (req, res) => {
    try {
        const transactionsPath = path.join(__dirname, "data", "transactions.json");
        const transactions = JSON.parse(fs.readFileSync(transactionsPath));

        const companyTransactions = transactions.filter(
            t => t.companyId === req.params.companyId
        );

        res.json(companyTransactions);
    } catch (error) {
        res.status(500).json({ error: "Unable to load transactions" });
    }
});

