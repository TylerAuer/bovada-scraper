import fs from 'fs';
import fetch from 'node-fetch';
import { BovadaApiResponse, BetData, BetOutcome } from './structs';

const endpoints = [
  // Game Props + Lines
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl/kansas-city-chiefs-tampa-bay-buccaneers-202102071830?lang=en',
  // Specials
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl-specials?marketFilterId=rank&preMatchOnly=true&lang=en',
  // TDs and FGs
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl-touchdown-and-field-goal-propositions/td-fg-propositions-super-bowl-55-202102071830?lang=en',
  // Defense and Special Teams
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl-defense-and-special-team-propositions/defense-sp-team-props-super-bowl-55-202102071830?lang=en',
  // Receiving props
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl-receiving-propositions/receiving-propositions-super-bowl-55-202102071830?lang=en',
  // Rushing props
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl-rushing-propositions/rushing-propositions-super-bowl-55-202102071830?lang=en',
  // QB props
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/super-bowl-quarterback-propositions/quarterback-props-super-bowl-55-202102071830?lang=en',
];

buildCsvOfPropsFromBovadaEndpoints(endpoints, 'csv/2021-02.csv');

/**
 * Takes a list of Bovada API endpoints and turns them into a CSV for the
 * Super Stupid Props Game
 *
 * @param endpoints List of endpoints to parse into bets for CSV
 */
async function buildCsvOfPropsFromBovadaEndpoints(
  endpoints: string[],
  filename: string
) {
  const bovadaApiResponses = await Promise.all(
    endpoints.map((endpoint) => fetchData(endpoint))
  );

  const bets = bovadaApiResponses
    .map((res) => parseResponseIntoBetList(res))
    .reduce((prev, next) => [...prev, ...next]);

  const csvString = combineRowsAndHeaderIntoCsvString(bets);
  writeToCsv(filename, csvString);
}

async function fetchData(url: string): Promise<any> {
  const res = await fetch(url);
  return await res.json();
}

/**
 * Parses Bovada prop into a row for the CSV
 *
 * @param response BovadaApiResponse Object
 */
function parseResponseIntoBetList(response: BovadaApiResponse): BetData[] {
  const betList: BetData[] = [];

  for (let listElem of response) {
    for (let event of listElem.events) {
      const eventName = event.description;

      for (let displayGroup of event.displayGroups) {
        // const displayGroupDesc = displayGroup.description;

        for (let prop of displayGroup.markets) {
          // Sometimes there is a placeholder prop that redirects users to
          // other sections. The placeholder always has an empty outcomes list.
          // So, this if() skips the placeholder
          if (!prop.outcomes.length) continue;

          const propDesc = prop.description;
          // const propDescKey = prop.descriptionKey;
          const betOutcomes: BetOutcome[] = [];

          for (let outcome of prop.outcomes) {
            const betOutcome: BetOutcome = {
              desc: outcome.description,
              odds: parseFloat(outcome.price.decimal),
            };

            if (outcome.price.handicap) {
              betOutcome.line = outcome.price.handicap;
            }

            betOutcomes.push(betOutcome);
          }
          betList.push({
            event: eventName,
            desc: propDesc,
            outcomes: betOutcomes,
          });
        }
      }
    }
  }
  return betList;
}

/**
 * Add header rows and line breaks. Returning a string that can be written
 * to a CSV file.
 *
 * @param data A list of CSV rows of bet data
 */
function combineRowsAndHeaderIntoCsvString(data: BetData[]): string {
  let maxOutcomes = 0;

  const listOfCSVRows = data.map((bet) => {
    maxOutcomes = Math.max(maxOutcomes, bet.outcomes.length);

    // Generate row for each outcome
    const outcomes = bet.outcomes.map((outcome) => {
      const line = outcome.line ? `$$line={${outcome.line}}` : '';

      const probability = Math.round((1 / outcome.odds) * 100);
      const points = 100 - Math.min(99, Math.max(probability, 1));

      return `${outcome.desc} ${line} $$odds=${outcome.odds} $$points=${points}`;
    });

    const betSpreadOrTotal = bet.outcomes[0].line
      ? `$$number=${bet.outcomes[0].line}`
      : '';

    return `${bet.event}, ${bet.desc} ${betSpreadOrTotal}, ${outcomes}`;
  });

  const headerRow = `Event, Bet, ${'Bet Side,'.repeat(listOfCSVRows.length)}\n`;

  return headerRow + listOfCSVRows.join('\n');
}

function writeToCsv(filename: string, data: string) {
  fs.writeFile(filename, data, (err) => {
    if (err) throw err;
  });
}
