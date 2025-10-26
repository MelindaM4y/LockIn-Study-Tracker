

//Local data handling
const DEFAULT_DATA = {
    score: 0,
    focusedSeconds: 0,   
    multiplier: 1,  
    highScore: 0,       
    lastReset: Date.now()
};

function saveData(data) {
    chrome.storage.local.set(data, () => {
        console.log('Data saved:', data);
    });
}

function getData(callback) {
    chrome.storage.local.get(Object.keys(DEFAULT_DATA), (result) => {
        const data = {...DEFAULT_DATA, ...result};
        callback(data);
    });
}

//Score tracker
function incrementScore(basePoints = 10, intervalSeconds = 1) {
    getData(({score, focusedSeconds, highScore}) => {
        focusedSeconds += intervalSeconds;
        const multiplier = computeMultiplier(focusedSeconds);
        score += basePoints * multiplier;

        // Update highScore if needed
        if (score > highScore) highScore = score;

        saveData({score, focusedSeconds, multiplier, highScore});
    });
}

//Resetting session
function resetSession() {
    saveData({
        score: 0,
        focusedSeconds: 0,
        multiplier: 1,
        lastReset: Date.now()
    });
    console.log('Session reset!');
}


//Multiplier feature 
function computeMultiplier(focusedSeconds) {
    if (focusedSeconds >= 120) return 3;      // 40+ min
    if (focusedSeconds >= 90) return 2.5;    // 30–39 min
    if (focusedSeconds >= 60) return 2;      // 20–29 min
    if (focusedSeconds >= 30) return 1.5;     // 10–19 min
    return 1;                                  // <10 min
}

function handleFocusLoss(lossSeconds) {
    console.log('=== handleFocusLoss CALLED ===');
    console.log('lossSeconds:', lossSeconds);
    console.log('Type of lossSeconds:', typeof lossSeconds);
    
    if (lossSeconds >= 10) {
        console.log('Loss >= 10 seconds, resetting multiplier and focusedSeconds to 0');
        saveData({focusedSeconds: 0, multiplier: 1});
        console.log('Multiplier reset complete!');
    } else {
        console.log('Loss < 10 seconds, subtracting from focusedSeconds');
        // Short loss: subtract lost seconds
        getData(({focusedSeconds}) => {
            console.log('Current focusedSeconds before subtraction:', focusedSeconds);
            focusedSeconds = Math.max(focusedSeconds - lossSeconds, 0);
            const multiplier = computeMultiplier(focusedSeconds);
            console.log('New focusedSeconds:', focusedSeconds, 'New multiplier:', multiplier);
            saveData({focusedSeconds, multiplier});
        });
    }
    console.log('=== handleFocusLoss END ===');
}

//High Score saving
function getHighScore(callback) {
    getData(({highScore}) => callback(highScore));
}

//Log Data
function logData() {
    getData((data) => console.log('Current data:', data));
}


// Create a global StorageHelper object
const StorageHelper = {
    incrementScore,
    resetSession,
    handleFocusLoss,
    getData,
    getHighScore,
    logData
};

console.log('functions.js loaded, StorageHelper:', typeof StorageHelper);

