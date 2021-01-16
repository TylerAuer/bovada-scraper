import fs from 'fs';
import fetch from 'node-fetch';
import { BovadaApiResponse, BetData, BetOutcome } from './structs';
/**
 * Given a bunch of endpoints, grab all of the bets, format them, and dump them
 * into a csv file I can import into google sheets
 */
export const endpoints = [
  // 'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/nfl?marketFilterId=rank&preMatchOnly=true&lang=en',
  'https://www.bovada.lv/services/sports/event/coupon/events/A/description/football/nfl',
];

scrapeEndpoints(endpoints);

async function scrapeEndpoints(endpoints: string[]) {
  const bovadaApiResponses = await Promise.all(
    endpoints.map((endpoint) => fetchData(endpoint))
  );

  const bets = bovadaApiResponses
    .map((res) => parseResponseIntoBetList(res))
    .reduce((prev, next) => [...prev, ...next]);

  // console.log(JSON.stringify(bets, null, 2));

  const csvString = parseIntoCsv(bets);
  writeToCsv('bets.csv', csvString);
}

async function fetchData(url: string): Promise<BovadaApiResponse> {
  const res = await fetch(url);
  return await res.json();
}

function parseResponseIntoBetList(response: BovadaApiResponse): BetData[] {
  const betList: BetData[] = [];

  for (let listElem of response) {
    for (let event of listElem.events) {
      const eventName = event.description;

      for (let displayGroup of event.displayGroups) {
        // const displayGroupDesc = displayGroup.description;

        for (let prop of displayGroup.markets) {
          const propDesc = prop.description;
          // const propDescKey = prop.descriptionKey;
          const betOutcomes: BetOutcome[] = [];

          for (let outcome of prop.outcomes) {
            const betOutcome: BetOutcome = {
              desc: outcome.description,
              odds: parseFloat(outcome.price.hongkong),
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

function parseIntoCsv(data: BetData[]): string {
  const listOfCSVRows = data.map((bet) => {
    const outcomes = bet.outcomes.map((outcome) => {
      const line = outcome.line ? `{${outcome.line}}` : '';

      return `${outcome.desc} ${line}, ${outcome.odds}`;
    });

    return `${bet.event},${bet.desc},${outcomes}`;
  });

  // Can inject a header row if I want

  return listOfCSVRows.join('');
}

function writeToCsv(filename: string, data: string) {
  fs.writeFile(filename, data, (err) => {
    if (err) throw err;
  });
}
