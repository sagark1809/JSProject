function registerUser() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            password,
            role: "company"
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        window.location.href = "login.html";
    });
}

function loginUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = "dashboard.html";
        } else {
            alert("Invalid credentials");
        }
    });
}
