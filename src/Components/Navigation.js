import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from './Home';
import Users from './Users';
import Lessons from './Lessons';
import Settings from './Settings';

function Navigation() {
    return (
        <div>
            <BrowserRouter>
                <div className="nav-cont">
                    {/* <Link to='/home'> */}
                    <div className="logo-cont" >
                        <div className="logo-div">
                            <img src='images/logo.png' width="auto" height="80px"  alt="logo"/>
                        </div>
                        <div className="logo-div">
                            <div className="main-logo-text">CebuLingo Admin</div>
                            <div className="mini-logo-text">Management Dashboard</div>
                        </div>
                    </div>
                    {/* </Link> */}

                    <Link to="/home" className='Link'>Home</Link>
                    <Link to="/users" className='Link'>Users</Link>
                    <Link to="/lessons" className='Link'>Lessons</Link>
                    <Link to="/settings" className='Link'>Settings</Link>
                </div>


                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/lessons" element={<Lessons />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </BrowserRouter>
        </div>

    )
}

export default Navigation;