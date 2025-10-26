

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
    if (lossSeconds >= 60) {
        // User looked away > 1 minute → reset focus and multiplier
        saveData({focusedSeconds: 0, multiplier: 1});
        console.log('Focus lost >1min: multiplier reset!');
    } else {
        // Short loss: subtract lost seconds
        getData(({focusedSeconds}) => {
            focusedSeconds = Math.max(focusedSeconds - lossSeconds, 0);
            const multiplier = computeMultiplier(focusedSeconds);
            saveData({focusedSeconds, multiplier});
        });
    }
}

//High Score saving
function getHighScore(callback) {
    getData(({highScore}) => callback(highScore));
}

//Log Data
function logData() {
    getData((data) => console.log('Current data:', data));
}


// Export functions (works in service worker and window contexts)
export {
    incrementScore,
    resetSession,
    handleFocusLoss,
    getData,
    getHighScore,
    logData
};
