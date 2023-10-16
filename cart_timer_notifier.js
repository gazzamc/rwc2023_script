// Get the bot token by following the guide https://core.telegram.org/bots/tutorial#obtain-your-bot-token
const TELEGRAM_TOKEN = "enter-your-token-here";
// Get chat_id from https://api.telegram.org/bot<api-key>/getUpdates
const TELEGRAM_CHAT_ID = 123456; // Enter your chat id here, get it from the above url

const DEBUG = false;
const REDIRECT = true;
const REDIRECT_URL = "https://tickets.rugbyworldcup.com/en/resale_{match}" // Set redirect if the timer in the basket expires

// Do Not Modify Below This Line
if (DEBUG) {
    console.log("script loaded")
}
const cartTimer = document.getElementsByClassName("expiration-timer")
let sentLastMessage = false;
let timeInterval;

const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        callback.apply(null, args);
      }, wait);
    };
  }

  function getTicketInfo() {
    const seats = document.getElementsByClassName('seat-content');
    let ticketInfo = '';
    for(let seat of seats) {
        ticketInfo +=  '\n\n' + seat.innerHTML
    }

    ticketInfo += '\n\n Cat(s):';
    for(let cat of document.getElementsByClassName('product-category')) {
        ticketInfo += '\n ' + cat.innerHTML.trim();
    }

    ticketInfo += '\n Total Price: ' + document.getElementsByClassName('order-total-to-pay-value')[0].innerHTML;

    return ticketInfo;
  }

  const sendToTelegram = debounce(() => {
    if (DEBUG) {
        console.log("Send To Telegram")
    }

    const ticketInfo = getTicketInfo();
    const message = encodeURI(`<a href="https://tickets.rugbyworldcup.com/en/cart">Tickets still in cart - ${getTime()} left to go!!</a>\nTicket(s) Info: ${ticketInfo}`);
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${message}&parse_mode=html`;
    const oReq = new XMLHttpRequest();

    try{
        oReq.open("GET", url, true);
        oReq.send();
    } catch(err){
        if (DEBUG) {
            console.log(err)
        }
    
    }
}, 10000);


function checkTime(minutesLeft, secondsLeft) {
    if(minutesLeft == 15){
        if (DEBUG) {
            console.log(`Tickets added to cart, ${minutesLeft}:${secondsLeft} left. Hurry!!`)
        }
    
        sendToTelegram()
    } 

    if(minutesLeft == 5){
        if (DEBUG) {
            console.log("5 Mins left until Tickets Expire!!")
        }
        sendToTelegram()
    } 
    
    if(minutesLeft == 2){
        if (DEBUG) {
            console.log("2 Mins left until Tickets Expire!!")
        }
        sendToTelegram()
    }

    if(minutesLeft == 0 && secondsLeft <= 60 && !sentLastMessage){
        if (DEBUG) {
            console.log("Less than a minute left until Tickets Expire!!")
        }
        sentLastMessage = true;
        sendToTelegram()
    }
}

function isTimer(time){
    if(time > 0){
        return true;
    }

    return false;
}

function getTime(){
    return cartTimer[0].firstElementChild.innerText;
}

function getTimerStatus(){
    if(cartTimer.length){
        let time = cartTimer[0].firstElementChild.innerText
        let minutesLeft = time.split(':')[0]
        let secondsLeft = time.split(':')[1]
    
        checkTime(minutesLeft, secondsLeft)

        if(!timeInterval){
            timeInterval = setInterval(getTimerStatus, 10000);

            // Send first message
            sendToTelegram()
        }

    } else {
        if (DEBUG) {
            console.log("Times up or nothing in cart!!, redirecting to " + REDIRECT_URL)
        }

        clearInterval(timeInterval);

        if(REDIRECT){
            location.href = REDIRECT_URL;
        }
    }
}

getTimerStatus();