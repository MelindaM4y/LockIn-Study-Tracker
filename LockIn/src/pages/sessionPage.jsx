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

    // --- Sync data from chrome storage ---
    const updateUiFromStorage = () => {
        getData((data) => {
            setScore(Math.floor(data.score));
            setHighScore(Math.floor(data.highScore));
            setMultiplier(data.multiplier);
        });
    };

    // --- Timer logic ---
    const startTimer = () => {
        clearInterval(intervalRef.current);
        startTimeRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current) / 1000);
            setSeconds(elapsed);
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
        return () => clearInterval(intervalRef.current);
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
