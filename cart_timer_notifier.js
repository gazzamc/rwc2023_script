console.log("script loaded")

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

  const sendToTelegram = debounce(() => {
    console.log("Send To Telegram")
    const message = `<a href="https://tickets.rugbyworldcup.com/en/cart">Tickets still in cart - ${getTime()} left to go!!</a>`;

    const token = "<telegram-bot-token>";
    // Get chat_id from https://api.telegram.org/bot<api-key>/getUpdates
    const chat_id = "<telegram-chat-id>";
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${message}&parse_mode=html`;
    
    const oReq = new XMLHttpRequest();

    try{
        oReq.open("GET", url, true);
        oReq.send();
    } catch(err){
        console.log(err)
    }
}, 10000);


function checkTime(minutesLeft, secondsLeft) {
    if(minutesLeft == 15){
        sendToTelegram()
        console.log(`Tickets added to cart, ${minutesLeft}:${secondsLeft} left. Hurry!!`)
    } 

    if(minutesLeft == 5){
        sendToTelegram()
        console.log("5 Mins left until Tickets Expire!!")
    } 
    
    if(minutesLeft == 2){
        sendToTelegram()
        console.log("2 Mins left until Tickets Expire!!")
    }

    if(minutesLeft == 0 && secondsLeft <= 60 && !sentLastMessage){
        sentLastMessage = true;
        sendToTelegram()
        console.log("Less than a minute left until Tickets Expire!!")
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
    console.log("Looping")
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
        console.log("Times up or nothing in cart!!")
        clearInterval(timeInterval);
    }
}

getTimerStatus();