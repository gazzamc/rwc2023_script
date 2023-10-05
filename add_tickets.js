const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        callback.apply(null, args);
      }, wait);
    };
  }

// Get chat_id from https://api.telegram.org/bot<api-key>/getUpdates
  const sendToTelegram = debounce(() => {
    console.log("Send To Telegram")
    const message = `<a href="https://tickets.rugbyworldcup.com/en/cart">Tickets Added to Cart - ${location.pathname.split("/").pop()}</a>`;

    const token = "your-token";
    const chat_id = chat_id;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${message}&parse_mode=html`;
    
    const oReq = new XMLHttpRequest();

    try{
        oReq.open("GET", url, true);
        oReq.send();
    } catch(err){
        console.log(err)
    }
}, 500);

function addScriptTags(func){
    const script = document.createElement('script');  
    script.setAttribute("type", "text/javascript")
    script.innerHTML = func
    document.head.appendChild(script);
}

console.log("Script Loaded!")

// CONSTANTS
const DATE_TIME = new Date().toLocaleString();
const DELAY_CLICKS = 2000;
const DELAY_RELOAD = 4000;
const TICKETS_WANTED = 2; // Need to get ticket total from basket

function detectErrorMessage(type){
    const errorModal = document.getElementById("ui-id-1");
    if(errorModal){
        const message = document.getElementById("drupal-modal")

        switch(type){
            case "Max":
                if(message.innerText.includes("You can't take more")){
                    return true;
                }
                break;
            case "Taken":
                if(message.innerText.includes("This listing is being bought")){
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
    if(document.getElementsByClassName("nb-tickets")){
        return parseInt(document.getElementsByClassName("nb-tickets")[0].innerHTML);
    }

    return 0;
}

function reloadPageWMsg(msg){
    console.log(`${msg}`, DATE_TIME)
    location.reload()
}

function redirectToCart(){
    location.href = 'https://tickets.rugbyworldcup.com/en/cart'
}

// Loop the site/ grab tix
function delayedLoop() {
    const cartBtns = getAllCartButtons();

    let buttonTotal = cartBtns.length
    let availableTickets;
    let clickCount = 0;
    let failedClick = 0;
    let successfulClick = 0;


    function clickResponse(){
        //Reload if ticket error
        if (detectErrorMessage("Taken") && clickCount === buttonTotal) { //Ticket is gone and we've clicked all the buttons
            reloadPageWMsg(document.getElementById("drupal-modal").innerHTML);
        } else if (detectErrorMessage("Taken")) { // Ticket gone, recork it as failed and continue
            failedClick++
        } else if (detectErrorMessage("Max")) { // Max Allowed, redirect
            console.log("Max tickets, redirect to cart!")
            sendToTelegram() 
            redirectToCart();

            availableTickets = -1;
            buttonTotal = -1;

        } else {
            successfulClick++
        }
    }

    function processItem(index) {
        cartBtns[index].click()
        clickCount++

        clickResponse();

        if (index < cartBtns.length - 1) {
            setTimeout(function () {
                processItem(index + 1);
            }, DELAY_CLICKS);
        }
    }

    if (buttonTotal === 0) { // No Tickets, redirect
        setTimeout(() => { reloadPageWMsg(`Reloading in ${DELAY_RELOAD / 1000} seconds!`);}, DELAY_CLICKS)
    } else if (
        (successfulClick == 6 && clickCount != failedClick) || //Hit max tickets and not all failed
        successfulClick > 0 && index < (cartBtns.length - 1)) { //At least one successful click && No more btns to click

        sendToTelegram() 
        console.log("Probably tickets, redirect to cart!")
        redirectToCart();
    } else if (buttonTotal === clickCount && clickCount === failedClick) { // Clicked all buttons and all clicks failed
        reloadPageWMsg("All Failed, Reloading!");
    } else { //Tickets available, start clicking
        // Check tickets available
        availableTickets = getAvailableTickets();

        console.log(`Available Tickets:  ${availableTickets}`) 
        console.log(`Number of Cart Btns:  ${buttonTotal}`)

        if(availableTickets && buttonTotal){
            processItem(0);
        }
    }
}


delayedLoop();