import logo from '../assets/LockInLogo.png';
import { useState, useEffect } from "react";

function SessionPage() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(Math.floor(secs % 60)).padStart(2, "0");
    return `Locked in for ${h}h ${m}m ${s}s...`;
  };

  return (
    <div className="bg-[#FBFBFF] min-w-[284px] min-h-[224px] overflow-hidden relative p-2">
      <img
        src={logo}
        alt="Logo"
        className="absolute top-[0px] left-[3px] w-[73px] h-[65px]"
      />

      <div className="absolute top-[18px] left-[75px] w-[203px] h-[23px] text-black text-[20px] font-sarpanch">
        Track Your Studying
      </div>

      <div className="absolute top-[60px] left-[115px] w-[68px] h-[23px] text-black text-[20px] font-sarpanch">
        SCORE
      </div>

      <div className="absolute top-[201px] left-[2px] w-[274px] h-[23px] font-sarpanch text-black text-[18px]">
        {formatTime(seconds)}
      </div>

      <button
        onClick={() => alert('End study session')}
        className="absolute top-[134px] left-[102px] w-[90px] h-[45px] bg-[#F6F872] text-black font-sarpanch font-extrabold border-3"
      >
        Session <span className="text-[#BD2C2C] font-black">Complete</span>
      </button>
    </div>
  );
}

export default SessionPage;
