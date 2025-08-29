import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import BoardEditor from "./BoardEditor";
import DiceRoller from "./DiceRoller";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <BoardEditor />
      <DiceRoller />
    </>
  );
}

export default App;
