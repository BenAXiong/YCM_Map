/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import TaiwanMap from './components/TaiwanMap';
import ReloadPrompt from './components/ReloadPrompt';

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50">
      <TaiwanMap />
      <ReloadPrompt />
    </div>
  );
}
