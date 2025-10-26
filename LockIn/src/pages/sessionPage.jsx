import logo from '../assets/LockInLogo.png';
import brick from '../assets/brickwall.png';
import { useState, useEffect, useRef } from "react";

function SessionPage() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Start timer
  useEffect(() => {
    startTimer();
    return () => clearInterval(intervalRef.current);
  }, []);

  const startTimer = () => {
    clearInterval(intervalRef.current);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setSeconds(elapsed);
    }, 1000);
  };

  const resetSession = () => {
    clearInterval(intervalRef.current);
    setSeconds(0);
    startTimer(); // restart immediately
  };

  const formatTime = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `Locked in for ${h}h ${m}m ${s}s...`;
  };

  return (
    <div
      className="min-w-[284px] min-h-[224px] overflow-hidden relative p-2 bg-cover bg-center"
      style={{ backgroundImage: `url(${brick})` }}
    >
      <img
        src={logo}
        alt="Logo"
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
        onClick={resetSession}
        className="absolute top-[140px] left-[102px] w-[90px] h-[45px] bg-[#F6F872] text-black font-sarpanch font-extrabold border-3"
      >
        Session <span className="text-[#BD2C2C] font-black">Complete</span>
      </button>

      <div className="absolute top-[63px] left-[50px] text-black text-[45px] font-sarpanch">
        000,000
      </div>

      <div className="absolute top-[115px] left-[70px] text-[#FFFFFF] text-[15px] font-sarpanch">
        High Score: 000,000
      </div>
    </div>
  );
}

export default SessionPage;
