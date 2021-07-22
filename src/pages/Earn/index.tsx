import { ErrorBoundary } from '@sentry/react'
import { JSBI } from '@ubeswap/sdk'
import { partition } from 'lodash'
import React, { useMemo } from 'react'
import styled from 'styled-components'

import { AutoColumn } from '../../components/Column'
import PoolCard from '../../components/earn/PoolCard'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { RowBetween } from '../../components/Row'
import { BIG_INT_ZERO } from '../../constants'
import { StakingInfo, useStakingInfo } from '../../state/stake/hooks'
import { ExternalLink, TYPE } from '../../theme'
import { DualPoolCard } from './DualPoolCard'
import { COUNTDOWN_END, LaunchCountdown } from './LaunchCountdown'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

const POOF_DUAL_POOL = '0x969D7653ddBAbb42589d73EfBC2051432332A940'
const POOF_DUAL_LP = '0x573bcEBD09Ff805eD32df2cb1A968418DC74DCf7'

const MOO_DUAL_POOL = '0x2f0ddEAa9DD2A0FB78d41e58AD35373d6A81EbB0'
const MOO_LP = '0x27616d3DBa43f55279726c422daf644bc60128a8'

export default function Earn() {
  // staking info for connected account
  const stakingInfos = useStakingInfo()

  // toggle copy if rewards are inactive
  const stakingRewardsExist = true

  const allPools = useMemo(
    () =>
      // Sort staking info by highest rewards
      stakingInfos?.slice().sort((a: StakingInfo, b: StakingInfo) => {
        return JSBI.toNumber(JSBI.subtract(b.totalRewardRate.raw, a.totalRewardRate.raw))
      }),
    [stakingInfos]
  )

  const [stakedPools, unstakedPools] = useMemo(() => {
    return partition(allPools, (pool) => pool.stakedAmount && JSBI.greaterThan(pool.stakedAmount.raw, BIG_INT_ZERO))
  }, [allPools])

  const [activePools, inactivePools] = partition(unstakedPools, (pool) => pool.active)

  const isGenesisOver = COUNTDOWN_END < new Date().getTime()

  const poofUBELP = allPools.find((pool) => pool.stakingToken.address === POOF_DUAL_LP)
  const mcUSDmcEURLP = allPools.find((pool) => pool.stakingToken.address === MOO_LP)

  return (
    <PageWrapper gap="lg" justify="center">
      {isGenesisOver && (
        <TopSection gap="md">
          <DataCard>
            <CardNoise />
            <CardSection>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>Ubeswap liquidity mining</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>
                    Deposit your Liquidity Provider tokens to receive UBE, the Ubeswap protocol governance token.
                  </TYPE.white>
                </RowBetween>{' '}
                <ExternalLink
                  style={{ color: 'white', textDecoration: 'underline' }}
                  href="https://docs.ubeswap.org/faq"
                  target="_blank"
                >
                  <TYPE.white fontSize={14}>Read more about UBE</TYPE.white>
                </ExternalLink>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </DataCard>
        </TopSection>
      )}

      {!isGenesisOver && <LaunchCountdown />}

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Dual Pools</TYPE.mediumHeader>
        </DataRow>
        {mcUSDmcEURLP && (
          <PoolSection>
            <ErrorBoundary>
              <DualPoolCard poolAddress={MOO_DUAL_POOL} underlyingPool={mcUSDmcEURLP} />
            </ErrorBoundary>
          </PoolSection>
        )}
        {poofUBELP && (
          <PoolSection>
            <ErrorBoundary>
              <DualPoolCard poolAddress={POOF_DUAL_POOL} underlyingPool={poofUBELP} />
            </ErrorBoundary>
          </PoolSection>
        )}
      </AutoColumn>

      {stakedPools.length > 0 && (
        <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
          <DataRow style={{ alignItems: 'baseline' }}>
            <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Your Pools</TYPE.mediumHeader>
            <div>{/* TODO(igm): show TVL here */}</div>
          </DataRow>

          <PoolSection>
            {stakedPools.map((pool) => (
              <ErrorBoundary key={pool.stakingRewardAddress}>
                <PoolCard stakingInfo={pool} />
              </ErrorBoundary>
            ))}
          </PoolSection>
        </AutoColumn>
      )}

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Available Pools</TYPE.mediumHeader>
          <div>
            {!isGenesisOver && (
              <span>
                Rewards begin on{' '}
                {new Date(COUNTDOWN_END).toLocaleString('en-us', {
                  timeZoneName: 'short',
                })}
              </span>
            )}
          </div>
          {/* TODO(igm): show TVL here */}
        </DataRow>
        <PoolSection>
          {stakingRewardsExist && stakingInfos?.length === 0 ? (
            <Loader style={{ margin: 'auto' }} />
          ) : (
            activePools?.map((pool) => (
              <ErrorBoundary key={pool.stakingRewardAddress}>
                <PoolCard stakingInfo={pool} />
              </ErrorBoundary>
            ))
          )}
        </PoolSection>
      </AutoColumn>

      {inactivePools.length > 0 && (
        <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
          <DataRow style={{ alignItems: 'baseline' }}>
            <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Inactive Pools</TYPE.mediumHeader>
            <div>{/* TODO(igm): show TVL here */}</div>
          </DataRow>

          <PoolSection>
            {inactivePools.map((pool) => (
              <ErrorBoundary key={pool.stakingRewardAddress}>
                <PoolCard stakingInfo={pool} />
              </ErrorBoundary>
            ))}
          </PoolSection>
        </AutoColumn>
      )}
    </PageWrapper>
  )
}
