import logo from '../assets/LockInLogo.png';
import brick from '../assets/brickwall.png';
import { useState, useEffect, useRef } from "react";
// Import the data handling functions from your other file
import { getData, incrementScore, resetSession as resetStoredSession } from '../functions';// NOTE: You must replace '../path/to/your/data-file' with the actual path to your file.

function SessionPage() {
    // Timer state (local to the UI)
    const [seconds, setSeconds] = useState(0); 
    const intervalRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    
    // Data state (synced with chrome.storage.local)
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    
    // Function to get the latest data from storage and update component state
    const updateUiFromStorage = () => {
        getData((data) => {
            setScore(Math.floor(data.score)); // Assuming score is floating point during calculation
            setHighScore(Math.floor(data.highScore));
            setMultiplier(data.multiplier);
        });
    };

    // --- Timer and Data Sync Logic ---

    const startTimer = () => {
        clearInterval(intervalRef.current);
        startTimeRef.current = Date.now();
        
        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current) / 1000);
            
            // 1. Update the local elapsed time state (for the UI display)
            setSeconds(elapsed);
            
            // 2. Call the data function to increment score and update storage
            // This also handles the logic for multiplier and high score updates.
            incrementScore(10, 1); // 10 base points per 1 second
            
            // 3. Sync the component state with the new data after incrementing
            updateUiFromStorage();

        }, 1000);
    };

    // Initial load and timer setup
    useEffect(() => {
        // Load initial state and start tracking score
        updateUiFromStorage();
        startTimer();
        
        // Cleanup function
        return () => clearInterval(intervalRef.current);
    }, []);

    // --- Session Control ---

    // Handles button click to end session
    const handleSessionComplete = () => {
        clearInterval(intervalRef.current); // Stop the current timer
        
        // Call the data function to clear the score, focusedSeconds, etc.
        resetStoredSession(); 
        
        // Reset local UI state to 0 and restart the timer for the next session
        setSeconds(0);
        setScore(0);
        setMultiplier(1);
        startTimer(); 
    };

    // --- UI Helpers ---

    const formatTime = (secs) => {
        const h = String(Math.floor(secs / 3600)).padStart(2, "0");
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        return `Locked in for ${h}h ${m}m ${s}s... `;
    };

    const formatScore = (score) => {
        return score.toLocaleString('en-US', { minimumIntegerDigits: 6 });
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

            <div className="absolute top-[50px] left-[115px] text-black text-[20px] font-sarpanch">
                SCORE
            </div>

            <div className="absolute top-[201px] left-[5px] text-black text-[18px] font-sarpanch">
                {formatTime(seconds)}
            </div>

            <button
                onClick={handleSessionComplete}
                className="absolute top-[140px] left-[102px] w-[90px] h-[45px] bg-[#F6F872] text-black font-sarpanch font-extrabold border-3"
            >
                Session <span className="text-[#BD2C2C] font-black">Complete</span>
            </button>

            <div className="absolute top-[63px] left-[50px] text-black text-[45px] font-sarpanch">
                {formatScore(score)}
            </div>

            <div className="absolute top-[115px] left-[70px] text-[#FFFFFF] text-[15px] font-sarpanch">
                High Score: {formatScore(highScore)}
            </div>
        </div>
    );
}

export default SessionPage;