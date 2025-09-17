import { HashRouter, Route, Routes } from 'react-router-dom';
import ChargePointConnection from './pages/ChargePointConnection';
import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/cp/:id' element={<ChargePointConnection />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
