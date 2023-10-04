// Loop the site/ grab tix
function delayedLoop() {
    const gmtDateTime = new Date().toUTCString();
    const clickDelay = 2000;
    const reloadDelay = 4000;
    const wanted = 2;
    const getAllButtons = document.getElementsByTagName("button")
    const cartBtns = [];


    let available = 0
    let clickCount = 0;
    let failedClick = 0;
    let successfulClick = 0;

    for (let btn of getAllButtons) {
        if (btn.id === "edit-add-to-cart") {
            cartBtns.push(btn);
        }
    }

    function processItem(index) {
        // Perform some task with the current item
        console.log("Clicking button " + index);

        cartBtns[index].click()
        clickCount++

        //Reload if ticket error
        if (document.getElementById("ui-id-1") && clickCount === available) {
            console.log("Error with all tickets, reloading!")
            console.log(document.getElementById("drupal-modal").innerHTML)
            location.reload()
        } else if (document.getElementById("ui-id-1")) {
            failedClick++
            console.log("Error with ticket, trying another!")
        } else {
            console.log("Success!")
            successfulClick++
        }

        //Max tickets reached, go to cart
        // if ((successfulClick == 6 && clickCount != failedClick) ||
        // successfulClick > 0 && index < cartBtns.length - 1) {
        //     location.href = 'https://tickets.rugbyworldcup.com/en/cart'
        // }

        // Check if there are more items to process
        if (index < cartBtns.length - 1) {
            // Set a timeout to process the next item after the delay
            setTimeout(function () {
                processItem(index + 1);
            }, clickDelay);
        }
    }

    // Start the loop with the first item
    if (cartBtns.length === 0 && clickCount === 0) {
        console.log("No Tickets!")
        setTimeout(() => {
            console.log(`Reloading in ${reloadDelay / 1000} seconds!`, gmtDateTime)
            location.reload()
        }, reloadDelay)
    } else if ((successfulClick == 6 && clickCount != failedClick) ||
        successfulClick > 0 && index < cartBtns.length - 1) {

        console.log("Probably tickets, redirect to cart!")
        location.href = 'https://tickets.rugbyworldcup.com/en/cart'
    } else if (cartBtns.length === clickCount && clickCount === failedClick) {

        console.log(`All failed, reloading!`, gmtDateTime)
        location.reload()
    } else {
        let availableElem = document.getElementsByClassName("nb-tickets").innerHTML;

        if(availableElem){
            available = availableElem.parseInt();
        }
    
        console.log(available, " Available")

        processItem(0);
    }
}


delayedLoop();