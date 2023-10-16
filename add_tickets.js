// CONSTANTS
const DATE_TIME = new Date().toLocaleString();

//Preferences
const NO_TICKETS_WANTED = 2; // No of tickets wanted, will still add single tickets if available, this wont circumvent the hard limit (6) on the site.
const MAX_PRICE = 600; // Maximum price per ticket (Not total), caution! any tickets higher than this price will not be added to basket, for best results don't make it too low
const PRIORITISE_MULTI = true; // Will sort by multi tickets and click those first
const REDIRECT_TO_CART = true; // If you prefer the bot doesn't redirect after adding tickets to basket.

//Some settings to try and reduce throttling
const ENABLE_ANTI_THROTTLE = true; // Adds a delay between refreshes when we hit the throttle page eg (Loading...), helps with the slowdown error.
const DELAY_CLICKS = 1000; // Delay between clicking cart buttons
const DELAY_RELOAD = (Math.floor(Math.random() * 101) * 2000); // Refresh delay on failure, no tickets
const THROTTLE_REFRESH_DELAY = (Math.floor(Math.random() * 101) * 2000); // Randomize the delay between 2 - 4 mins
const THROTTLE_CHECK_DELAY = 100; // Delay before checking if we have been throttled // Needs to be long enough for page to load or we might miss the tickets // Adds delay to execution
const THROTTLE_TIMEOUT_TIME = 10000; // When checking for throttling we can timeout after a certain time, I think 10 secs is good as the server may be slow.
const CHECK_CLICK_RESPONSE_TIMEOUT = 300; // Adds a delay when checking if click was successful, can add a delay to each click but will reduce false positives (someone grabs ticket first)

//Misc
const PERF = true; // Displays execution time between clicks
const DEBUG = true; // Adds debug messages, caution will increase bot execution time

// Telegram settings
const ENABLE_TELEGRAM = true;
const TELEGRAM_TOKEN = "replace-this-with-token";
// Get chat_id from https://api.telegram.org/bot<api-key>/getUpdates
const TELEGRAM_CHAT_ID = 123456;

// Don't modify below this line
let start;
let end;
let redirecting = false;

const clickEvent = new MouseEvent("click", {
    "view": window,
    "bubbles": true,
    "cancelable": false
});

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

const redirectToCart = debounce(() => {
    window.stop();

    if (DEBUG) {
        console.log("Redirect To Cart")
    }

    location.href = 'https://tickets.rugbyworldcup.com/en/cart'
}, 200)

const sendToTelegramAndRedirect = debounce(() => {
    if (DEBUG) {
        console.log("Send To Telegram")
    }

    const message = `<a href="https://tickets.rugbyworldcup.com/en/cart">Tickets Added to Cart - ${location.pathname.split("/").pop()}</a>`;
    const token = TELEGRAM_TOKEN;
    const chat_id = TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${message}&parse_mode=html`;
    const oReq = new XMLHttpRequest();

    try {
        oReq.open("GET", url, true);
        oReq.onreadystatechange = () => { if (REDIRECT_TO_CART) { redirectToCart() } };
        oReq.send();
    } catch (err) {
        // Failed Redirect
        if (DEBUG) {
            console.log(err)
        }

        if (REDIRECT_TO_CART) {
            redirectToCart()
        }
    }
}, 500);

function closeModal() {
    const errorModal = document.getElementsByClassName("ui-dialog")[0];

    // Close window to prevent false positive
    try {
        const errorMsgBTn = errorModal.getElementsByTagName("Button")[0]
        errorMsgBTn.click();
    } catch {
        //
    }

}

function detectErrorMessage(type) {
    const errorModal = document.getElementsByClassName("ui-dialog")[0];
    if (errorModal) {
        const message = document.getElementById("drupal-modal")

        switch (type) {
            case "Max":
                if (message.innerText.includes("You can't take more")) {
                    return true;
                }
                break;
            case "Taken":
                if (
                    message.innerText.includes("This listing is being bought") ||
                    message.innerText.includes("This listing is not in sell anymore."
                    )) {

                    return true;
                }
                break;
            default:
                return false;
        }
    }
}

function getAllCartButtons(type) {
    let elements;
    let priceInfo;
    let pricePT;
    let ticketCount;

    const buttons = [];

    if (type === "multi") {
        elements = document.getElementsByClassName('multi-tickets');
    } else {
        elements = document.getElementsByClassName('resale-pack-details');
    }

    for (let elem of elements) {
        // Get Price per ticket
        priceInfo = elem.getElementsByClassName('price-info')[0].innerText.trim();
        pricePT = parseInt(/([0-9])\w+/g.exec(priceInfo)[0]);

        // Get number of tickets (multi)
        ticketCount = elem.getElementsByClassName('resale-listing-row').length;

        if (pricePT <= MAX_PRICE && ticketCount <= NO_TICKETS_WANTED) {
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
    window.location.reload(true)
}

function redirect() {
    redirecting = true
    const ticketsInCart = getNoOfTicketsInCart();
    // Double check we have tickets
    if (ticketsInCart > 0) {
        if (DEBUG) {
            console.log("Tickets confirmed in cart!")
        }

        if (ENABLE_TELEGRAM) {
            sendToTelegramAndRedirect()
        } else {
            if (REDIRECT_TO_CART) {
                redirectToCart()
            }
        }
    } else {
        if (DEBUG) {
            console.log("No tickets in cart, refreshing!")
        }

        reloadPageWMsg('')
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

    if (PRIORITISE_MULTI && cartBtns_default.length > 1) {
        cartBtns_multi = getAllCartButtons("multi");
    }

    if (cartBtns_default.length) {
        // Check tickets available
        availableTickets = getAvailableTickets();
    }

    function clickResponse() {
        if (DEBUG) {
            console.log("clickCount", clickCount)
            console.log("buttonTotal", buttonTotal)
        }

        //If we meet our threshold then we redirect
        if (NO_TICKETS_WANTED == getNoOfTicketsInCart() && !redirecting) {
            clickingDisabled = true

            if (DEBUG) {
                console.log("No of tickets threshold matched, redirecting to cart!")
            }

            if (REDIRECT_TO_CART) {
                redirect();
            }
        }

        if (detectErrorMessage("Taken") && clickCount === buttonTotal) { //Ticket is gone and we've clicked all the buttons
            if (DEBUG) {
                console.log('All Taken, buttons exhausted')
            }

            return reloadPageWMsg("All Taken, buttons exhausted");
        }

        if (detectErrorMessage("Taken")) { // Ticket gone, count it as failed and continue
            if (DEBUG) {
                console.log('Grabbing ticket failed')
            }

            failedClick++
            closeModal();
        } else {
            successfulClick++
        }

        if (detectErrorMessage("Max") && !redirecting) { // Max Allowed, redirect
            clickingDisabled = true

            if (DEBUG) {
                console.log("Max tickets, redirect to cart and/or send to telegram!")
            }

            if (REDIRECT_TO_CART) {
                redirect();
            }
        }

        if (!redirecting && buttonTotal === clickCount && getNoOfTicketsInCart() > 0) { // Added at least one ticket to basket, all buttons clicked
            clickingDisabled = true

            if (DEBUG) {
                console.log("Clicked All buttons, redirecting to cart!")
            }

            if (REDIRECT_TO_CART) {
                redirect();
            }

        };
    }

    function processItem(index) {
        if (cartBtns_multi.length && !multiExhausted && !redirecting) {
            // Try clicking until it fails, then reset
            try {
                cartBtns_multi[index].dispatchEvent(clickEvent);
                clickCount++
                setTimeout(() => clickResponse(), CHECK_CLICK_RESPONSE_TIMEOUT);
            } catch (err) {
                // no more multies, revert to singles
                // resettings params
                if (cartBtns_default.length > cartBtns_multi.length) { // No Point re-setting if we only have multi options
                    index = 0;
                }
                multiExhausted = true;
            }
        } else if (!redirecting) {
            cartBtns_default[index].dispatchEvent(clickEvent);
            clickCount++

            // wait a slight bit in order for error to appear
            setTimeout(() => clickResponse(), CHECK_CLICK_RESPONSE_TIMEOUT);
        }

        if (PERF) {
            end = Date.now();
            console.log(`Execution time per click: ${end - start} ms`);
        }

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
        if (index < (cartBtns_default.length - 1) && !redirecting) {
            if (PERF) {
                start = Date.now();
            }

            if (!clickingDisabled) {
                setTimeout(function () {
                    processItem(index + 1);
                }, DELAY_CLICKS);
            } else {
                if (DEBUG) {
                    console.log("Disabled clicking, sending message and/or redirecting!")
                }
            }
        } else {
            if (DEBUG) {
                console.log("Finished, No more buttons to click or Redirecting!")
            }
        }
    }

    if (buttonTotal === 0) { // No Tickets, redirect
        //Check if cart exists
        let cart = document.getElementById('edit-show-product-cart');
        let ticketsInCart = getNoOfTicketsInCart();

        if (cart && ticketsInCart > 0) {
            if (DEBUG) {
                console.log("%c Tickets in cart", "color: #ff0000");
            }
            if (REDIRECT_TO_CART) {
                redirect();
            }
        }

        if (DEBUG) {
            console.log(`%c No Tickets within price range or none available, if the former, adjust max price setting`, 'color: #ff0000')
        }

        setTimeout(() => { reloadPageWMsg(`Reloading in ${DELAY_RELOAD / 1000} seconds!`); }, DELAY_RELOAD)
    } else if (
        buttonTotal === clickCount && (clickCount === failedClick ||
            clickCount === successfulClick)) { // Clicked all buttons and all clicks failed
        reloadPageWMsg("All Failed, Reloading!");
    }

    if (availableTickets > 0 && buttonTotal > 0) {
        if (DEBUG) {
            console.log('Process buttons')
        }

        processItem(0);
    };
}

if (PERF) {
    start = Date.now();
}


setTimeout(() => {
    if (document.readyState === "complete" && document.body.innerHTML === '\nLoading...\n\n\n' && ENABLE_ANTI_THROTTLE) {
        if (DEBUG) {
            console.log(`%c Checking Throttle`, 'color: #00ff00')
        }


        // Don't stop loading immediately to give time for page to resolve
        setTimeout(() => { console.log(`Stop window`); window.stop() }, (THROTTLE_TIMEOUT_TIME > DELAY_RELOAD ? DELAY_RELOAD / 2 : THROTTLE_TIMEOUT_TIME));
        let waitTime = THROTTLE_REFRESH_DELAY;

        if (document.getElementsByClassName('unavailable-page-visual').length) {
            if (DEBUG) {
                console.log(`%c Not being throttled, continuing!`, 'color: #00ff00')
            }

        } else {
            if (DEBUG) {
                console.log(`Possibly being throttled, lets wait for ${(waitTime / 1000)} seconds before refreshing.`)
            }
            setTimeout(() => reloadPageWMsg(`${(waitTime / 1000)} seconds later, reloading!`, false), waitTime);
        }

        if (PERF) {
            end = Date.now();
            console.log(`Execution time - Throttle Check: ${end - start} ms`);
        }

    } else {
        if (DEBUG) {
            console.log(`%c Scanning page`, 'color: #00ff00')
        }

        startLoop();
    }
}, THROTTLE_CHECK_DELAY);
