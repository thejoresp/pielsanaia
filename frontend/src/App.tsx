import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Results from './pages/Results';
import ConditionInfo from './pages/ConditionInfo';
import About from './pages/About';
import ResultsOpenAI from './pages/ResultsOpenAI';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        {/* key: remonta la página si se cambia de tipo sin pasar por la home */}
        <Route path="results-lunares" element={<Results key="moles" tipo="moles" />} />
        <Route path="results-acne" element={<Results key="acne" tipo="acne" />} />
        <Route path="results-rosacea" element={<Results key="rosacea" tipo="rosacea" />} />
        <Route path="results-openai" element={<ResultsOpenAI />} />
        <Route path="conditions/:condition" element={<ConditionInfo />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;