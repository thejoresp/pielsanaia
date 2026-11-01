import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ResultsLunares from './pages/ResultsLunares';
import ConditionInfo from './pages/ConditionInfo';
import About from './pages/About';
import ResultsAcne from './pages/ResultsAcne';
import ResultsRosacea from './pages/ResultsRosacea';
import ResultsOpenAI from './pages/ResultsOpenAI';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="results-lunares" element={<ResultsLunares />} />
        <Route path="results-acne" element={<ResultsAcne />} />
        <Route path="results-rosacea" element={<ResultsRosacea />} />
        <Route path="results-openai" element={<ResultsOpenAI />} />
        <Route path="conditions/:condition" element={<ConditionInfo />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;