import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ChargePointConnection from './pages/ChargePointConnection';
import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route
          path='/charge-point-connection'
          element={<ChargePointConnection />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
