// scripts/payments.js
document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            document.querySelectorAll('.crypto').forEach(el => el.style.display = 'none');
            return;
        }

        document.querySelectorAll('.crypto').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.crypto').forEach(crypto => {
            crypto.addEventListener('click', function() {
                const currency = this.id.toUpperCase();
                showDepositModal(currency, user.uid);
            });
        });
    });
});

function showDepositModal(currency, userId) {
    const modalContent = `
        <div class="modal fade" id="cryptoDepositModal" tabindex="-1" aria-labelledby="depositModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="background-color: #120f28; border: none; border-radius: 10px;">
                    <div class="modal-header border-bottom-0" style="background-color: #120f28;">
                        <h1 class="modal-title fs-3 text-light" id="depositModalLabel">Deposit with ${currency}</h1>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-0" style="background-color: #120f28;">
                        <form id="depositForm">
                            <div class="mb-3">
                                <label for="depositAmount" class="form-label text-light">Amount (USD) - Max $100</label>
                                <input type="number" class="form-control" id="depositAmount" min="0.10" max="100" step="0.10" required 
                                    style="background-color: #1a1536; border-color: #2c2556; color: #fff;">
                            </div>
                            <button type="submit" class="btn btn-primary w-100" 
                                style="background-color: #2c2556; border: none; transition: background-color 0.3s;"
                                onmouseover="this.style.backgroundColor='#3d3475'"
                                onmouseout="this.style.backgroundColor='#2c2556'">Proceed to Payment</button>
                        </form>
                        <p class="mt-3 text-center" style="color: var(--colorsecondary);">2% transaction fee applies</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('cryptoDepositModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    const modal = new bootstrap.Modal(document.getElementById('cryptoDepositModal'));
    modal.show();
    
    document.getElementById('depositForm').addEventListener('submit', function(e) {
        e.preventDefault();
        let amount = parseFloat(document.getElementById('depositAmount').value);
        
        // Client-side validation and rounding
        if (amount > 100) {
            alert('Maximum deposit amount is $100.');
            return;
        }
        if (amount < 0.10) {
            alert('Minimum deposit amount is $0.10.');
            return;
        }
        
        // Round to nearest $0.10
        amount = Math.round(amount * 10) / 10;
        
        $.ajax({
            url: 'scripts/server/coinbase_payment.php',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                amount: amount,
                currency: currency,
                user_id: userId
            }),
            success: (response) => {
                console.log('Success response:', response);
                if (response.status === 'success') {
                    window.location.href = response.payment_url;
                } else {
                    alert('Error: ' + response.error);
                }
            },
            error: (xhr) => {
                console.error('AJAX Error:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText
                });
                alert('An error occurred while processing your payment. Check console for details.');
            }
        });
    });
}