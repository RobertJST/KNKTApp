document.addEventListener('DOMContentLoaded', () => { // After the Page loads
    Notif = document.getElementById("Response");
    const registerForm = document.getElementById('registerForm'); // Get register form
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => { // On Submit
            e.preventDefault(); //Stops page refresh
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            // Chekcs that Password and confirm Password are the same
            if (data.password !== data.confirmPassword) {
                Notif.textContent = "Passwords don't match";

                return;
            }

            delete data.confirmPassword; // Remove confirmPassword before sending to DB
            
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            resp = await response.text()
            if (resp == 'Success') {
                window.location.href = "Login.html"
            }
            else if(resp == 'Reg') {
                Notif.textContent = 'Already registered';
            }
            else {
                Notif.textContent = 'Error during Registration';
            };
        });
    }
});