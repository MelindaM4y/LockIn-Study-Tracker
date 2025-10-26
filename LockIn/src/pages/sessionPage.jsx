import logo from '../assets/LockInLogo.png';
import brick from '../assets/brickwall.png';
import { useState, useEffect, useRef } from "react";
import { getData, incrementScore, resetSession as resetStoredSession } from '../functions';

function SessionPage() {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false); // track if session is active
    const intervalRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    // Stored data
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    
    // WebGazer tracking state
    const [tracking, setTracking] = useState(false);
    const [isLooking, setIsLooking] = useState(true);
    const lastGazeSentRef = useRef(0);
    
    // Function to get the latest data from storage and update component state

    // --- Sync data from chrome storage ---
    const updateUiFromStorage = () => {
        getData((data) => {
            setScore(Math.floor(data.score));
            setHighScore(Math.floor(data.highScore));
            setMultiplier(data.multiplier);
        });
    };

    // --- WebGazer Camera & Tracking ---
    
    const startTracking = async () => {
        try {
            // Tell background to start the scoring loop
            chrome.runtime.sendMessage({ 
                type: 'START_SCORING'
            });
            
            // Request camera permission (prompts for extension origin)
            await navigator.mediaDevices.getUserMedia({ video: true });

            // Start WebGazer in the popup
            if (window.webgazer) {
                // Temporarily suppress the HTTPS alert from WebGazer
                const originalAlert = window.alert;
                window.alert = () => {};
                
                window.webgazer
                    .setGazeListener((data, timestamp) => {
                        // Throttle to once per second
                        const now = Date.now();
                        if (now - lastGazeSentRef.current < 1000) {
                            return;
                        }
                        lastGazeSentRef.current = now;
                        
                        // Send gaze data to background (even if null)
                        // We'll use face detection (data exists) as the indicator of looking
                        chrome.runtime.sendMessage({ 
                            type: 'GAZE_DATA', 
                            data,  // Can be null if no face detected
                            timestamp 
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.log('Message error:', chrome.runtime.lastError);
                            }
                        });
                        
                        if (data) {
                            console.log('Face detected - user is looking');
                        } else {
                            console.log('No face detected - user looked away');
                        }
                    })
                    .showVideo(false)
                    .showFaceOverlay(false)
                    .showFaceFeedbackBox(false)
                    .showPredictionPoints(false)
                    .saveDataAcrossSessions(true)
                    .applyKalmanFilter(true);

                await window.webgazer.begin();
                
                // Restore original alert
                window.alert = originalAlert;
                
                setTracking(true);
                startTimer();
                
                console.log('WebGazer tracking started in popup');
            }
        } catch (err) {
            console.error('Camera permission denied or unavailable:', err);
        }
    };

    const stopTracking = () => {
        // Tell background to stop the scoring loop
        chrome.runtime.sendMessage({ 
            type: 'STOP_SCORING'
        });
        
        if (window.webgazer) {
            window.webgazer.pause();
        }
        setTracking(false);
        clearInterval(intervalRef.current);
        console.log('Tracking stopped');
    };

    // Listen for focus state updates from background
    useEffect(() => {
        const messageListener = (msg) => {
            if (msg.type === 'FOCUS_STATE_UPDATE') {
                setIsLooking(msg.looking);
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        return () => chrome.runtime.onMessage.removeListener(messageListener);
    }, []);

    // --- Timer and Data Sync Logic ---

    // --- Timer logic ---
    const startTimer = () => {
        clearInterval(intervalRef.current);
        startTimeRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current) / 1000);
            setSeconds(elapsed);
            
            // 2. Only increment score if user is actively looking at the screen
            // The background worker handles scoring based on gaze data
            
            // 3. Sync the component state with the new data from storage
            incrementScore(10, multiplier);
            updateUiFromStorage();
        }, 1000);
    };

    const stopTimer = () => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    };

    // --- Start or stop session ---
    const handleSessionToggle = () => {
        if (isRunning) {
            // Stop session
            stopTimer();
            resetStoredSession();
            setSeconds(0);
            setScore(0);
            setMultiplier(1);
            setIsRunning(false);
        } else {
            // Start session
            updateUiFromStorage();
            startTimer();
            setIsRunning(true);
        }
    };

    // --- Cleanup ---
    useEffect(() => {
        // Load initial state but don't start timer until user clicks Start
        updateUiFromStorage();
        
        // Cleanup function
        return () => {
            clearInterval(intervalRef.current);
            if (tracking) stopTracking(); 
    }, []);

    // --- UI Helpers ---
    const formatTime = (secs) => {
        const h = String(Math.floor(secs / 3600)).padStart(2, "0");
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        return `Locked in for ${h}h ${m}m ${s}s...`;
    };

    const formatScore = (score) => {
        return score.toLocaleString('en-US', { minimumIntegerDigits: 1 });
    };

    // --- Render ---
    return (
        <div
            className="min-w-[284px] min-h-[224px] overflow-hidden relative p-2 bg-cover bg-center"
            style={{ backgroundImage: `url(${brick})` }}
        >
            <img
                src={logo}
                alt="LockIn Logo"
                className="absolute top-[0px] left-[3px] w-[73px] h-[65px]"
            />

            <div className="absolute top-[18px] left-[75px] text-black text-[20px] font-sarpanch">
                Track Your Studying
            </div>

            <div className="absolute top-[50px] left-[127px] text-black text-[20px] font-sarpanch">
                SCORE
            </div>

            <div className="absolute top-[201px] left-[5px] text-black text-[18px] font-sarpanch">
                {formatTime(seconds)}
            </div>

            {/* Tracking status indicator */}
            <div className="absolute top-[2px] right-[5px] flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isLooking ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-[10px] text-black font-sarpanch">
                    {tracking ? (isLooking ? 'Tracking' : 'Away') : 'Off'}
                </span>
            </div>

            {/* Start/Stop Tracking Button - REMOVED (keeping code for later) */}
            {/* <button
                onClick={tracking ? stopTracking : startTracking}
                className="absolute top-[70px] left-[5px] w-[40px] h-[25px] bg-[#4CAF50] text-white text-[10px] font-sarpanch font-bold border-2 border-black"
            >
                {tracking ? 'Stop' : 'Start'}
            </button> */}

            {/* Button toggles session start/stop */}
            <button
                onClick={handleSessionToggle}
                className="absolute top-[140px] left-[117px] w-[90px] h-[45px] bg-[#F6F872] text-black font-sarpanch font-extrabold border-3"
            >
                {isRunning ? (
                    <>Session <span className="text-[#BD2C2C] font-black">Complete</span></>
                ) : (
                    <>Start <span className="text-[#2CBD2C] font-black">Session</span></>
                )}
            </button>

            {/* Centered Score + Multiplier */}
            <div className="absolute top-[63px] left-1/2 transform -translate-x-1/2 w-[180px] h-[60px] flex justify-center items-center relative">
                <span className="text-black text-[45px] font-sarpanch text-center">
                    {formatScore(score)}
                </span>
                <span className="absolute top-[-8px] right-[-8px] font-sarpanch text-[#D72929] text-[30px] rotate-[-11.64deg] font-black">
                    {multiplier}x
                </span>
            </div>

            <div className="absolute top-[115px] left-[87px] text-[#FFFFFF] text-[15px] font-sarpanch">
                High Score: {formatScore(highScore)}
            </div>
        </div>
    );
}

export default SessionPage;
