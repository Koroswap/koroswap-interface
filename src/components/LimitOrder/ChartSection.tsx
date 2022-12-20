import { useApolloClient } from '@apollo/client'
import { Token } from '@ubeswap/sdk'
import { ParentSize } from '@visx/responsive'
import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import { ChartOption } from './ChartSelector'
import { PriceChart, PricePoint } from './PriceChart'
import { getBlocksFromTimestamps, HOURLY_PAIR_RATES, splitQuery } from './queries'
import { LoadingChart } from './Skeleton'
import TimePeriodSelector, { defaultTimePeriod, isRestricted, TimePeriod } from './TimeSelector'

const ChartContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 6px 0;
  border: 0 solid ${({ theme }) => theme.bg4};
  border-bottom-width: 1px;
  height: 436px;
  width: 100%;
  @media screen and (max-width: 1115px) {
    border: 0;
    padding-bottom: 20px;
    height: 330px;
    position: static;
  }
`

const TimeOptionsContainer = styled.div`
  position: absolute;
  top: 18px;
  width: 100%;
  @media only screen and (max-width: 1115px) {
    position: static;
  }
`

function toCoingeckoHistoryDuration(timePeriod: TimePeriod) {
  switch (timePeriod) {
    case TimePeriod.HOUR:
      return '1'
    case TimePeriod.DAY:
      return '1'
    case TimePeriod.WEEK:
      return '7'
    case TimePeriod.MONTH:
      return '31'
    case TimePeriod.YEAR:
      return '365'
    case TimePeriod.ALL:
      return 'max'
  }
}

async function getCoingeckoPrice(id: string, t: TimePeriod, signal: any): Promise<PricePoint[]> {
  return await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=USD&days=${toCoingeckoHistoryDuration(t)}`,
    { signal: signal }
  )
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data.prices)
    .then((prices) => (t == TimePeriod.HOUR ? prices.slice(-12) : prices))
    .then((prices) => prices.map((p: [number, number]) => ({ timestamp: p[0] / 1000, value: p[1] })))
    .catch((e) => console.log('Error:', e))
}

function toHourDuration(timePeriod: TimePeriod) {
  // Return in Hours: [Period, Interval]
  switch (timePeriod) {
    case TimePeriod.DAY:
      return [24, 1] // 25 Points
    case TimePeriod.WEEK:
      return [168, 4] // 43 Points
    case TimePeriod.MONTH:
      return [720, 24] // 31 Points
    default:
      return [8760, 219] // 41 Points
  }
}

export async function getPairPrice(id: string, t: TimePeriod, gqlClient: any, is0: boolean, signal: any) {
  try {
    const [hours, interval] = toHourDuration(t)
    const now = Math.round(new Date().getTime() / 1000)

    let time = now - (hours * 3600 + 3600)

    // create an array of hour start times until we reach current hour
    const timestamps = []
    while (time <= now) {
      timestamps.push(time)
      time += 3600 * interval
    }

    // once you have all the timestamps, get the blocks for each timestamp in a bulk query
    const blocks = await getBlocksFromTimestamps(timestamps, 100, { context: { fetchOptions: { signal } } })
    // catch failing case
    if (!blocks || blocks?.length === 0) {
      return []
    }

    const result: any = await splitQuery(HOURLY_PAIR_RATES, gqlClient, [id], blocks, 100, {
      context: { fetchOptions: { signal } },
    })

    const values = []
    for (const row in result) {
      const timestamp = row.split('t')[1]
      if (timestamp && result[row]) {
        values.push({
          timestamp: Number(timestamp),
          value: parseFloat(result[row][`token${is0 ? '0' : '1'}Price`]),
        })
      }
    }

    return values
  } catch (e) {
    console.log('Error:', e)
  }
  return null
}

export default function ChartSection({ chart }: { chart: ChartOption | undefined }) {
  const [chartSetting, setChartSetting] = useState<{
    prices: PricePoint[] | null
    timePeriod: TimePeriod
    loading: boolean
  }>({
    prices: null,
    timePeriod: defaultTimePeriod,
    loading: false,
  })
  const controllerRef = useRef<AbortController | null>()

  const client = useApolloClient()
  const restrictTimeFrame = chart?.currencies instanceof Array

  const fetchPrice = async (ch: ChartOption | undefined, ti: TimePeriod) => {
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controllerRef.current?.signal

    if (ch?.coingeckoID) {
      return getCoingeckoPrice(ch?.coingeckoID, ti, signal).then((coingeckoPrices) => {
        setChartSetting({ prices: coingeckoPrices, timePeriod: ti, loading: false })
      })
    } else if (ch?.pairID) {
      return getPairPrice(
        ch.pairID,
        ti,
        client,
        ch.currencies[0].address.toLowerCase() > ch.currencies[1].address.toLowerCase(),
        signal
      ).then((graphqlPrices) => setChartSetting({ prices: graphqlPrices, timePeriod: ti, loading: false }))
    } else {
      setChartSetting({ prices: null, timePeriod: ti, loading: false })
    }
  }
  useEffect(() => {
    const time: TimePeriod =
      isRestricted(chartSetting.timePeriod) && chart?.pairID ? defaultTimePeriod : chartSetting.timePeriod
    setChartSetting({ prices: [], timePeriod: time, loading: true })
    fetchPrice(chart, time)
  }, [chart?.currencies])

  return (
    <ChartContainer>
      <ParentSize>
        {(parent) =>
          chartSetting.loading ? (
            <LoadingChart height={parent.height} />
          ) : (
            <PriceChart
              prices={chartSetting.prices ?? null}
              width={parent.width}
              height={parent.height}
              isDollar={chart?.currencies instanceof Token}
              timePeriod={chartSetting.timePeriod}
            />
          )
        }
      </ParentSize>
      <TimeOptionsContainer>
        <TimePeriodSelector
          restrict={restrictTimeFrame}
          onTimeChange={(t: TimePeriod) => {
            setChartSetting({ prices: [], timePeriod: t, loading: true })
            fetchPrice(chart, t)
          }}
        />
      </TimeOptionsContainer>
    </ChartContainer>
  )
}
