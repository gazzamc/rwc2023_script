// CONSTANTS
const DATE_TIME = new Date().toLocaleString();
const DELAY_CLICKS = 2000; // Delay between clicking cart buttons
const DELAY_RELOAD = 15000; // Refresh delay on failure, no tickets
const NO_TICKETS_WANTED = 2; // No of tickets wanted
const DEBUG = true;
const ENABLE_TELEGRAM = true;
const PRIORITISE_MULTI = true; // Will sort pairs tickets and click those first
const MAX_PRICE = 300; //Maximum price per ticket (Not total)
const ENABLE_ANTI_THROTTLE = true; // Adds a delay between refreshes when we hit the throttle page eg (Loading...), helps with the slowdown error.
const THROTTLE_DELAY = () => (Math.random()>=0.5)? 60000 : 120000; // Randomize the delay between 1 - 2 mins

const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            callback.apply(null, args);
        }, wait);
    };
}

function getNoOfTicketsInCart() {
    let ticketsGrabbed = 0;
    // Get all types of tickets
    const cartItems = document.getElementsByClassName('cart-items');
    // Loop types and get quantity
    for (let item of cartItems) {
        ticketsGrabbed += parseInt(item.querySelector(".product-qty .placeholder").innerHTML)
    }

    return ticketsGrabbed;
}

function redirectToCart() {
    location.href = 'https://tickets.rugbyworldcup.com/en/cart'
}

const sendToTelegramAndRedirect = debounce(() => {
    if (DEBUG) {
        console.log("Send To Telegram")
    }

    const message = `<a href="https://tickets.rugbyworldcup.com/en/cart">Tickets Added to Cart - ${location.pathname.split("/").pop()}</a>`;
    const token = "<telegram-bot-token>";
    // Get chat_id from https://api.telegram.org/bot<api-key>/getUpdates
    const chat_id = "<telegram-chat-id>";
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${message}&parse_mode=html`;
    const oReq = new XMLHttpRequest();

    try {
        oReq.open("GET", url, true);
        oReq.onreadystatechange = redirectToCart;
        oReq.send();
    } catch (err) {
        // Failed Redirect
        console.log(err)
        redirectToCart();
    }
}, 500);

function addScriptTags(func) {
    const script = document.createElement('script');
    script.setAttribute("type", "text/javascript")
    script.innerHTML = func
    document.head.appendChild(script);
}

function detectErrorMessage(type) {
    const errorModal = document.getElementById("ui-id-1");
    if (errorModal) {
        const message = document.getElementById("drupal-modal")

        switch (type) {
            case "Max":
                if (message.innerText.includes("You can't take more")) {
                    return true;
                }
                break;
            case "Taken":
                if (message.innerText.includes("This listing is being bought")) {
                    return true;
                }
                break;
            default:
        }

    } else {
        return false;
    }
}

function getAllCartButtons(type) {
    let elements;
    let html;
    let pricePT;

    const buttons = [];

    if (type === "multi") {
        elements = document.getElementsByClassName('multi-tickets');
    } else {
        elements = document.getElementsByClassName('resale-pack-details');
    }

    for (let elem of elements) {
        // Get Price per ticket
        html = elem.getElementsByClassName('price-info')[0].innerText.trim();
        pricePT = parseInt(/([0-9])\w+/g.exec(html)[0]);

        if(pricePT <= MAX_PRICE){
            for (let btn of elem.getElementsByTagName("button")) {
                if (btn.id === "edit-add-to-cart") {
                    buttons.push(btn);
                }
            }
        }
    }

    return buttons
}

function getAvailableTickets() {
    if (document.getElementsByClassName("nb-tickets")) {
        return parseInt(document.getElementsByClassName("nb-tickets")[0].innerHTML);
    }

    return 0;
}

function reloadPageWMsg(msg) {
    console.log(`${msg}`, DATE_TIME)
    location.reload()
}

function redirect() {
    if (ENABLE_TELEGRAM) {
        sendToTelegramAndRedirect()
    } else {
        redirectToCart();
    }
}

if (DEBUG) {
    console.log("Script Loaded!")
}

function startLoop() {
    const cartBtns_default = getAllCartButtons(); //Order of page
    let clickingDisabled = false;
    let multiExhausted = false;

    let buttonTotal = cartBtns_default.length;
    let clickCount = 0;
    let failedClick = 0;
    let successfulClick = 0;
    let cartBtns_multi = 0;
    let availableTickets;

    if (PRIORITISE_MULTI) {
        cartBtns_multi = getAllCartButtons("multi");
    }

    if (cartBtns_default.length) {
        // Check tickets available
        availableTickets = getAvailableTickets();
    }

    function clickResponse() {
        if (detectErrorMessage("Taken") && clickCount === buttonTotal) { //Ticket is gone and we've clicked all the buttons
            reloadPageWMsg(document.getElementById("drupal-modal").innerHTML);
        } else if (detectErrorMessage("Taken")) { // Ticket gone, count it as failed and continue
            failedClick++
        } else if (detectErrorMessage("Max")) { // Max Allowed, redirect
            clickingDisabled = true
            if (DEBUG) {
                console.log("Max tickets, redirect to cart!")
            }

            redirect();

        } else if (buttonTotal === clickCount && successfulClick > 0) { // Added at least one ticket to basket, all buttons clicked
            clickingDisabled = true

            if (DEBUG) {
                console.log("Clicked All buttons, redirecting to cart!")
            }
            redirect();

        } else {
            successfulClick++
        }

        //If we meet our threshold then we redirect
        if (NO_TICKETS_WANTED == getNoOfTicketsInCart()) {
            clickingDisabled = true

            if (DEBUG) {
                console.log("No of tickets threshold matched, redirecting to cart!")
            }

            redirect();
        }
    }

    function processItem(index) {
        if (DEBUG) {
            console.log(`Available Tickets:  ${availableTickets}`)
            console.log(`Wanted Tickets:  ${NO_TICKETS_WANTED}`)
            console.log(`Number of Cart Btns (within price threshold):  ${buttonTotal}`)
            console.log(`Clicks:  ${clickCount}`)
            console.log(`Failed Clicks:  ${failedClick}`)
            console.log(`Successful Clicks:  ${successfulClick}`)
            console.log(`Tickets in cart:  ${getNoOfTicketsInCart()}`)
            console.log(`Multi-tickets:  ${cartBtns_multi.length}`)
        }

        if(cartBtns_multi.length && !multiExhausted){
            // Try clicking until it fails, then reset
            try{
                cartBtns_multi[index].click()
            } catch (err){
                // no more multies, revert to singles
                // resettings params
                if(cartBtns_default.length > cartBtns_multi.length){ // No Point re-setting if we only have multi options
                    index = 0;
                }
                multiExhausted = true;
            }
        } else {
            cartBtns_default[index].click()
        }

        clickCount++
        clickResponse();

        if (index < cartBtns_default.length - 1) {

            if (!clickingDisabled) {
                setTimeout(function () {
                    processItem(index + 1);
                }, DELAY_CLICKS);
            } else {
                if (DEBUG) {
                    console.log("Disabled clicking, sending message and/or redirecting!")
                }
            }
        }
    }

    if (buttonTotal === 0) { // No Tickets, redirect
        setTimeout(() => { reloadPageWMsg(`Reloading in ${DELAY_RELOAD / 1000} seconds!`); }, DELAY_CLICKS)
    } else if (buttonTotal === clickCount && clickCount === failedClick) { // Clicked all buttons and all clicks failed
        reloadPageWMsg("All Failed, Reloading!");
    }

    if (availableTickets > 0 && buttonTotal > 0) {
        processItem(0);
    };
}

setTimeout(() => {
    if (document.readyState === "complete" && document.body.innerHTML === '\nLoading...\n\n\n' && ENABLE_ANTI_THROTTLE){
        console.log("Possibly being throttled, lets wait for a minute or two before refreshing.")
        window.stop();
        setTimeout(() => reloadPageWMsg(`${(THROTTLE_DELAY /1000)} seconds later, reloading!`), THROTTLE_DELAY);
     } else{
        startLoop();
     }      
}, 1000);
