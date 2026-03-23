import './App.css';
// import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
// import Home from './Components/Home';
// import Users from './Components/Users';
// import Lessons from './Components/Lessons';
// import Settings from './Components/Settings';
import Navigation from './Components/Navigation';

function App() {
  return (
    <div className='main-cont'>
      <div className='nav-cont'>
        <Navigation />
      </div>
      {/* <Users/> */}
    </div>
  );
}

export default App;
