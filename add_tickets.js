// CONSTANTS
const DATE_TIME = new Date().toLocaleString();
const DELAY_CLICKS = 2000;
const DELAY_RELOAD = 4000;
const NO_TICKETS_WANTED = 2;
const DEBUG = true;
const ENABLE_TELEGRAM = true;

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
    for(let item of cartItems){
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

function getAllCartButtons() {
    const buttons = [];

    for (let btn of document.getElementsByTagName("button")) {
        if (btn.id === "edit-add-to-cart") {
            buttons.push(btn);
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

if (DEBUG) {
    console.log("Script Loaded!")
}

function startLoop() {
    const cartBtns = getAllCartButtons();
    let availableTickets;

    if (cartBtns.length) {
        // Check tickets available
        availableTickets = getAvailableTickets();
    }

    let clickingDisabled = false;
    let buttonTotal = cartBtns.length;
    let clickCount = 0;
    let failedClick = 0;
    let successfulClick = 0;


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

            if (ENABLE_TELEGRAM) {
                sendToTelegramAndRedirect()
            } else {
                redirectToCart();
            }

        } else if (buttonTotal === clickCount && successfulClick > 0) { // Added at least one ticket to basket, all buttons clicked
            clickingDisabled = true

            if (DEBUG) {
                console.log("Clicked All buttons, redirecting to cart!")
            }

            if (ENABLE_TELEGRAM) {
                sendToTelegramAndRedirect()
            } else {
                redirectToCart();
            }
        } else {
            successfulClick++
        }

        //If we meet our threshold then we redirect
        if (successfulClick == getNoOfTicketsInCart()) {
            clickingDisabled = true

            if (DEBUG) {
                console.log("No of tickets threshold matched, redirecting to cart!")
            }

            if (ENABLE_TELEGRAM) {
                sendToTelegramAndRedirect()
            } else {
                redirectToCart();
            }
        }
    }

    function processItem(index) {
        if (DEBUG) {
            console.log(`Available Tickets:  ${availableTickets}`)
            console.log(`Wanted Tickets:  ${NO_TICKETS_WANTED}`)
            console.log(`Number of Cart Btns:  ${buttonTotal}`)
            console.log(`Clicks:  ${clickCount}`)
            console.log(`Failed Clicks:  ${failedClick}`)
            console.log(`Successful Clicks:  ${successfulClick}`)
            console.log(`Tickets in cart:  ${getNoOfTicketsInCart()}`)
        }

        cartBtns[index].click()
        clickCount++
        clickResponse();

        if (index < cartBtns.length - 1) {

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
        // Stop page loading from server side, this should prevent "SLOWED DOWN" page
        window.stop();
        setTimeout(() => { reloadPageWMsg(`Reloading in ${DELAY_RELOAD / 1000} seconds!`); }, DELAY_CLICKS)
    } else if (buttonTotal === clickCount && clickCount === failedClick) { // Clicked all buttons and all clicks failed
        reloadPageWMsg("All Failed, Reloading!");
    }

    if (availableTickets > 0 && buttonTotal > 0) {
        processItem(0);
    };
}


startLoop();