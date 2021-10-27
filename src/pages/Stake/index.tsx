import { useContractKit, useGetConnectedSigner } from '@celo-tools/use-contractkit'
import { TokenAmount } from '@ubeswap/sdk'
import { ButtonEmpty, ButtonLight, ButtonPrimary, ButtonRadio } from 'components/Button'
import { AutoColumn } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { CardNoise, CardSection, DataCard } from 'components/earn/styled'
import Loader from 'components/Loader'
import { AutoRow, RowBetween } from 'components/Row'
import { useDoTransaction } from 'components/swap/routing'
import { VotableStakingRewards__factory } from 'generated/factories/VotableStakingRewards__factory'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import { useVotableStakingContract } from 'hooks/useContract'
import { BodyWrapper } from 'pages/AppBody'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WrappedTokenInfo } from 'state/lists/hooks'
import { useSingleCallResult } from 'state/multicall/hooks'
import { tryParseAmount } from 'state/swap/hooks'
import { useCurrencyBalance } from 'state/wallet/hooks'
import styled from 'styled-components'
import { ExternalLink, TYPE } from 'theme'

import { BIG_INT_SECONDS_IN_WEEK } from '../../constants'

enum DelegateIdx {
  ABSTAIN,
  FOR,
  AGAINST,
}

const StyledButtonRadio = styled(ButtonRadio)({
  padding: '8px',
  borderRadius: '4px',
})

const VOTABLE_STAKING_REWARDS_ADDRESS = '0x25e18159Ce62cB815df0E3582a6CFCA5735c65F4'

const TopSection = styled(AutoColumn)({
  maxWidth: '480px',
  width: '100%',
})

const Wrapper = styled.div({
  margin: '0px 24px',
})

const ube = new WrappedTokenInfo(
  {
    address: '0x00be915b9dcf56a3cbe739d9b9c202ca692409ec',
    name: 'Ubeswap Governance Token',
    symbol: 'UBE',
    chainId: 42220,
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_UBE.png',
  },
  []
)

export const Stake: React.FC = () => {
  const { t } = useTranslation()
  const { address, connect } = useContractKit()
  const getConnectedSigner = useGetConnectedSigner()
  const [amount, setAmount] = useState('')
  const tokenAmount = tryParseAmount(amount === '' ? '0' : amount, ube)
  const [approvalState, approve] = useApproveCallback(tokenAmount, VOTABLE_STAKING_REWARDS_ADDRESS)
  const [staking, setStaking] = useState(true)
  const ubeBalance = useCurrencyBalance(address ?? undefined, ube)
  const contract = useVotableStakingContract(VOTABLE_STAKING_REWARDS_ADDRESS)
  const stakeBalance = new TokenAmount(
    ube,
    useSingleCallResult(contract, 'balanceOf', [address ?? undefined]).result?.[0] ?? 0
  )
  // 0 - Abstain
  // 1 - For
  // 2 - Against
  const userDelegateIdx = useSingleCallResult(contract, 'userDelegateIdx', [address ?? undefined]).result?.[0]
  const earned = new TokenAmount(ube, useSingleCallResult(contract, 'earned', [address ?? undefined]).result?.[0] ?? 0)
  const totalSupply = new TokenAmount(ube, useSingleCallResult(contract, 'totalSupply', []).result?.[0] ?? 0)
  const rewardRate = new TokenAmount(ube, useSingleCallResult(contract, 'rewardRate', []).result?.[0] ?? 0)
  const userRewardRate = totalSupply.greaterThan('0') ? stakeBalance.multiply(rewardRate).divide(totalSupply) : null

  const doTransaction = useDoTransaction()
  const onStakeClick = useCallback(async () => {
    const c = VotableStakingRewards__factory.connect(VOTABLE_STAKING_REWARDS_ADDRESS, await getConnectedSigner())
    if (!tokenAmount) {
      return
    }
    return await doTransaction(c, 'stake', {
      args: [tokenAmount.raw.toString()],
      summary: `Stake ${amount} UBE`,
    })
  }, [doTransaction, amount, getConnectedSigner, tokenAmount])
  const onUnstakeClick = useCallback(async () => {
    const c = VotableStakingRewards__factory.connect(VOTABLE_STAKING_REWARDS_ADDRESS, await getConnectedSigner())
    if (!tokenAmount) {
      return
    }
    return await doTransaction(c, 'withdraw', {
      args: [tokenAmount.raw.toString()],
      summary: `Unstake ${amount} UBE`,
    })
  }, [doTransaction, amount, getConnectedSigner, tokenAmount])
  const onClaimClick = useCallback(async () => {
    const c = VotableStakingRewards__factory.connect(VOTABLE_STAKING_REWARDS_ADDRESS, await getConnectedSigner())
    return await doTransaction(c, 'getReward', {
      args: [],
      summary: `Claim UBE rewards`,
    })
  }, [doTransaction, getConnectedSigner])
  const changeDelegateIdx = useCallback(
    async (delegateIdx: number) => {
      if (delegateIdx === userDelegateIdx) {
        return
      }
      const c = VotableStakingRewards__factory.connect(VOTABLE_STAKING_REWARDS_ADDRESS, await getConnectedSigner())
      return await doTransaction(c, 'changeDelegateIdx', {
        args: [delegateIdx],
        summary: `Change auto-governance selection to ${DelegateIdx[delegateIdx]}`,
      })
    },
    [doTransaction, getConnectedSigner, userDelegateIdx]
  )

  let button = <ButtonLight onClick={() => connect().catch(console.warn)}>{t('connectWallet')}</ButtonLight>
  if (address) {
    if (staking) {
      if (approvalState !== ApprovalState.APPROVED) {
        button = (
          <ButtonPrimary
            onClick={() => approve().catch(console.error)}
            disabled={!tokenAmount}
            altDisabledStyle={approvalState === ApprovalState.PENDING} // show solid button while waiting
          >
            {approvalState === ApprovalState.PENDING ? (
              <AutoRow gap="6px" justify="center">
                Approving <Loader stroke="white" />
              </AutoRow>
            ) : (
              'Approve UBE'
            )}
          </ButtonPrimary>
        )
      } else {
        button = (
          <ButtonPrimary onClick={onStakeClick} disabled={isNaN(Number(amount)) || Number(amount) <= 0}>
            {t('stake')}
          </ButtonPrimary>
        )
      }
    } else {
      button = (
        <ButtonPrimary onClick={onUnstakeClick} disabled={isNaN(Number(amount)) || Number(amount) <= 0}>
          {t('unstake')}
        </ButtonPrimary>
      )
    }
  }

  return (
    <>
      <TopSection gap="md">
        <DataCard style={{ marginBottom: '32px' }}>
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>UBE Staking</TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>
                  Stake UBE to automatically participate in governance and earn UBE rewards.
                </TYPE.white>
              </RowBetween>
            </AutoColumn>
          </CardSection>
          <CardNoise />
        </DataCard>
        <div style={{ textAlign: 'center' }}>
          <h2>Your UBE stake: {stakeBalance ? stakeBalance.toFixed(2, { groupSeparator: ',' }) : '--'} UBE</h2>
          {userRewardRate?.greaterThan('0') ? (
            <>
              <h3>
                Your weekly UBE rewards:{' '}
                {userRewardRate
                  ? userRewardRate.multiply(BIG_INT_SECONDS_IN_WEEK).toFixed(2, { groupSeparator: ',' })
                  : '--'}{' '}
                UBE / week
              </h3>
              <h3>
                Your{' '}
                <ExternalLink href={'https://romulus.page/romulus/0xa7581d8E26007f4D2374507736327f5b46Dd6bA8'}>
                  auto-governance
                </ExternalLink>{' '}
                selection:
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <StyledButtonRadio active={userDelegateIdx === 1} onClick={() => changeDelegateIdx(1)}>
                  For
                </StyledButtonRadio>
                <StyledButtonRadio active={userDelegateIdx === 0} onClick={() => changeDelegateIdx(0)}>
                  Abstain
                </StyledButtonRadio>
                <StyledButtonRadio active={userDelegateIdx === 2} onClick={() => changeDelegateIdx(2)}>
                  Against
                </StyledButtonRadio>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <h3>Unclaimed UBE: {userRewardRate ? earned.toFixed(4, { groupSeparator: ',' }) : '--'}</h3>
                <ButtonEmpty padding="8px" borderRadius="8px" width="fit-content" onClick={onClaimClick}>
                  {t('claim')}
                </ButtonEmpty>
              </div>
            </>
          ) : (
            <h3>
              Weekly UBE rewards:{' '}
              {rewardRate ? rewardRate.multiply(BIG_INT_SECONDS_IN_WEEK).toFixed(2, { groupSeparator: ',' }) : '--'} UBE
              / week
            </h3>
          )}
        </div>
      </TopSection>
      <BodyWrapper style={{ marginTop: '16px' }}>
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100px' }}>
            <StyledButtonRadio active={staking} onClick={() => setStaking(true)}>
              Stake
            </StyledButtonRadio>
          </div>
          <div style={{ width: '100px' }}>
            <StyledButtonRadio active={!staking} onClick={() => setStaking(false)}>
              Unstake
            </StyledButtonRadio>
          </div>
        </div>
        <Wrapper>
          <div style={{ margin: '32px 0px' }}>
            <CurrencyInputPanel
              id="stake-currency"
              value={amount}
              onUserInput={setAmount}
              label={t('amount')}
              showMaxButton
              onMax={() => {
                if (staking) {
                  ubeBalance && setAmount(ubeBalance.toSignificant(6))
                } else {
                  stakeBalance && setAmount(stakeBalance.toSignificant(6))
                }
              }}
              currency={ube}
              disableCurrencySelect
              balanceOverride={staking ? ubeBalance : stakeBalance}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>{button}</div>
        </Wrapper>
      </BodyWrapper>
    </>
  )
}
