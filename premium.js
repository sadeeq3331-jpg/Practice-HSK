// ==================== HSK PREMIUM SYSTEM ====================
// Version 1.0 -
// To add new codes.

(function() {
  // ---------- CONFIGURATION (Edit these as needed) ----------
  var VALID_CODES = [
    'LXSL022024104',
    'HSK-MARY002',
    'HSK-ALEX003',
    'HSK-SADEEQ01'
  ];
  
  var CONTACT = {
    email: 'sadeeq3331@gmail.com',
    phone: '15578840796',
    wechat: 'Sadeeq331',
    price: '10 yuan'
  };
  
  var PREMIUM_KEY = 'hsk_premium_active';
  var PREMIUM_CODE_KEY = 'hsk_premium_code';
  
  // ---------- INJECT CONTACT SECTION (for hub pages) ----------
  function injectContactSection() {
    // Only inject if the container exists
    var container = document.getElementById('premium-contact-container');
    if (!container) return;
    
    container.innerHTML = `
      <div style="margin: 2rem 0 1.5rem; padding: 1.5rem; background: var(--bg-card); border-radius: 1.5rem; border: 2px solid var(--accent); text-align: center;">
        <h3 style="color: var(--accent); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
          <i class="fas fa-crown" style="color: #ffd700;"></i>
          <span>Remove All Ads – Only ${CONTACT.price}</span>
        </h3>
        <p style="margin-bottom: 1.25rem; color: var(--text-secondary);">Contact me to get your personal ad‑free access code.</p>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; align-items: center;">
          <a href="mailto:${CONTACT.email}?subject=HSK%20Premium%20Access" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); padding: 0.6rem 1.2rem; border-radius: 2rem; border: 1px solid var(--border-light); color: var(--text-primary); transition: 0.2s;">
            <i class="far fa-envelope" style="color: #ea4335; font-size: 1.2rem;"></i>
            <span>${CONTACT.email}</span>
          </a>
          
          <a href="tel:+86${CONTACT.phone}" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); padding: 0.6rem 1.2rem; border-radius: 2rem; border: 1px solid var(--border-light); color: var(--text-primary); transition: 0.2s;">
            <i class="fas fa-phone-alt" style="color: #34a853;"></i>
            <span>${CONTACT.phone.slice(0,3)} ${CONTACT.phone.slice(3,7)} ${CONTACT.phone.slice(7)}</span>
          </a>
          
          <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); padding: 0.6rem 1.2rem; border-radius: 2rem; border: 1px solid var(--border-light); cursor: pointer;" onclick="window.copyWeChat()">
            <i class="fab fa-weixin" style="color: #07c160; font-size: 1.2rem;"></i>
            <span>WeChat: ${CONTACT.wechat}</span>
            <i class="far fa-copy" style="margin-left: 0.3rem; color: var(--accent);"></i>
          </div>
        </div>
        
        <p style="margin-top: 1.25rem; font-size: 0.85rem; opacity: 0.9; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
          <i class="fas fa-hand-holding-heart" style="color: var(--accent);"></i>
          <span>Each code is for personal use only. Please don't share—it helps keep the price low!</span>
        </p>
      </div>
    `;
  }
  
  // ---------- INJECT UNLOCK BUTTON & MODAL (for content pages) ----------
  function injectUnlockUI() {
    // Check if already injected
    if (document.getElementById('premiumUnlockBtn')) return;
    
    // Create button
    var btn = document.createElement('button');
    btn.id = 'premiumUnlockBtn';
    btn.className = 'premium-unlock-btn';
    btn.innerHTML = '<i class="fas fa-crown"></i> Unlock Ad‑Free';
    document.body.appendChild(btn);
    
    // Create modal
    var modal = document.createElement('div');
    modal.id = 'unlockModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3><i class="fas fa-lock-open"></i> Enter Access Code</h3>
        <p style="font-size: 0.9rem; opacity: 0.8;">Enter the unique code you received after payment.</p>
        <input type="text" id="accessCodeInput" class="code-input" placeholder="e.g., HSK-ABC123" autocomplete="off" spellcheck="false">
        <div class="error-message" id="codeError"></div>
        <div class="modal-actions">
          <button class="modal-btn primary" id="submitCodeBtn">Unlock</button>
          <button class="modal-btn secondary" id="closeModalBtn">Cancel</button>
        </div>
        <p style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.6;">
          <i class="fas fa-shield-alt"></i> This code is for your personal use only.
        </p>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add styles dynamically if not already present
    if (!document.getElementById('premium-styles')) {
      var style = document.createElement('style');
      style.id = 'premium-styles';
      style.textContent = `
        .premium-unlock-btn {
          position: fixed;
          bottom: 80px;
          right: 20px;
          z-index: 1000;
          background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
          color: #1e1b4b;
          border: none;
          border-radius: 40px;
          padding: 0.6rem 1.2rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 8px;
          border: 2px solid white;
          font-size: 0.95rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .premium-unlock-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        .premium-unlock-btn i {
          color: #ffd700;
        }
        .modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.6);
          z-index: 2000;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: var(--bg-card, #fff);
          padding: 2rem;
          border-radius: 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid var(--accent, #4f46e5);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          color: var(--text-primary, #1e1b4b);
        }
        .modal-content h3 {
          color: var(--accent, #4f46e5);
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .code-input {
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 3rem;
          border: 2px solid var(--border-light, #c7d2fe);
          margin: 1.2rem 0;
          font-size: 1.1rem;
          text-align: center;
          text-transform: uppercase;
          background: var(--bg-card, #fff);
          color: var(--text-primary, #1e1b4b);
        }
        .code-input:focus {
          outline: none;
          border-color: var(--accent, #4f46e5);
        }
        .modal-actions {
          display: flex;
          gap: 0.8rem;
        }
        .modal-btn {
          flex: 1;
          padding: 0.8rem;
          border-radius: 3rem;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
        .modal-btn.primary {
          background: var(--accent, #4f46e5);
          color: white;
        }
        .modal-btn.secondary {
          background: transparent;
          border: 1px solid var(--border-light, #c7d2fe);
          color: var(--text-primary, #1e1b4b);
        }
        .error-message {
          color: #e53e3e;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          min-height: 1.2rem;
        }
        body.premium-active .adsbygoogle,
        body.premium-active .ad-container,
        body.premium-active [id*="adTop"],
        body.premium-active [id*="adBottom"],
        body.premium-active ins.adsbygoogle {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Attach event listeners
    attachUnlockEvents();
  }
  
  function attachUnlockEvents() {
    var unlockBtn = document.getElementById('premiumUnlockBtn');
    var modal = document.getElementById('unlockModal');
    var codeInput = document.getElementById('accessCodeInput');
    var codeError = document.getElementById('codeError');
    var submitBtn = document.getElementById('submitCodeBtn');
    var closeBtn = document.getElementById('closeModalBtn');
    
    if (!unlockBtn || !modal) return;
    
    unlockBtn.addEventListener('click', function() {
      modal.style.display = 'flex';
      codeInput.value = '';
      codeError.innerText = '';
    });
    
    closeBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });
    
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    submitBtn.addEventListener('click', function() {
      var code = codeInput.value.trim().toUpperCase();
      if (VALID_CODES.indexOf(code) !== -1) {
        localStorage.setItem(PREMIUM_KEY, 'true');
        localStorage.setItem(PREMIUM_CODE_KEY, code);
        modal.style.display = 'none';
        applyPremiumState();
        alert('🎉 Premium unlocked! Ads have been removed.\n\nThank you for supporting independent content! Please do not share your code.');
      } else {
        codeError.innerText = 'Invalid code. Please check and try again.';
      }
    });
    
    codeInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });
  }
  
  // ---------- REMOVE ADS ----------
  function removeAds() {
    document.body.classList.add('premium-active');
    // Additional direct hiding for stubborn ads
    var adSelectors = ['.ad-container', '.adsbygoogle', 'ins.adsbygoogle', '[id*="adTop"]', '[id*="adBottom"]'];
    adSelectors.forEach(function(sel) {
      var els = document.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) {
        els[i].style.display = 'none';
      }
    });
  }
  
  // ---------- APPLY PREMIUM STATE ----------
  function applyPremiumState() {
    if (localStorage.getItem(PREMIUM_KEY) === 'true') {
      var btn = document.getElementById('premiumUnlockBtn');
      if (btn) btn.style.display = 'none';
      removeAds();
    } else {
      var btn = document.getElementById('premiumUnlockBtn');
      if (btn) btn.style.display = 'flex';
    }
  }
  
  // ---------- COPY WECHAT (global function) ----------
  window.copyWeChat = function() {
    navigator.clipboard.writeText(CONTACT.wechat).then(function() {
      alert('✅ WeChat ID "' + CONTACT.wechat + '" copied to clipboard!');
    }).catch(function() {
      prompt('Please manually copy:', CONTACT.wechat);
    });
  };
  
  // ---------- INITIALIZATION ----------
  function init() {
    // For hub pages: inject contact section if container exists
    injectContactSection();
    
    // For content pages: inject unlock UI if not on a hub page? 
    // We'll inject unlock UI on all pages except maybe we can check for a flag.
    // Simple approach: always inject unlock UI (hub pages will have it too, but that's fine)
    injectUnlockUI();
    
    // Apply premium state on load
    applyPremiumState();
  }
  
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
