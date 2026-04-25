import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/global.css';
import ZipLookup from './pages/ZipLookup';
import MyReps from './pages/MyReps';
import PoliticianProfile from './pages/PoliticianProfile';
import Nav from './components/Nav';

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/"             element={<ZipLookup />} />
        <Route path="/reps"         element={<MyReps />} />
        <Route path="/politician/:id" element={<PoliticianProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
