import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import SvgCreator from '../js/svg-creator.js';
import { exampleGameScores } from './statistics-example-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const chart = new SvgCreator(exampleGameScores);
let svg = chart.createStatisticsSvg();

svg = svg
	.replace("viewbox=", "viewBox=")
	.replace(
		">",
		" role='img' aria-labelledby='chart-title chart-description'>" +
		"<title id='chart-title'>Beispielstatistik: Hören und Schreiben</title>" +
		"<desc id='chart-description'>Die Bearbeitungszeit sinkt mit natürlichen Schwankungen über 30 Übungseinheiten von 108 auf 47 Sekunden; zugleich fällt die Fehlerzahl langfristig von acht auf null.</desc>"
	);

fs.writeFileSync(
	path.join(__dirname, 'statistik-hoeren-und-schreiben-beispiel.svg'),
	svg + '\n',
	'utf8'
);
