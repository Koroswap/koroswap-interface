import LimitOrderHistoryBody from 'components/LimitOrderHistory/LimitOrderHistoryBody'
import { LimitOrderHistoryButton } from 'components/LimitOrderHistory/LimitOrderHistoryButton'
import LimitOrderHistoryItem from 'components/LimitOrderHistory/LimitOrderHistoryItem'
import { Wrapper } from 'components/swap/styleds'
import React, { useState } from 'react'

import { useLimitOrdersHistory } from './useOrderBroadcasted'

export const LimitOrderHistory: React.FC = () => {
  const limitOrderHistory = useLimitOrdersHistory()

  const [openOrdersTabActive, setOpenOrdersTabActive] = useState<boolean>(true)

  return (
    <LimitOrderHistoryBody>
      <div style={{ display: 'inline-block', textAlign: 'center', width: '-webkit-fill-available', padding: '1rem' }}>
        <LimitOrderHistoryButton active={openOrdersTabActive} onClick={() => setOpenOrdersTabActive(true)}>
          Open
        </LimitOrderHistoryButton>
        <LimitOrderHistoryButton active={!openOrdersTabActive} onClick={() => setOpenOrdersTabActive(false)}>
          Completed
        </LimitOrderHistoryButton>
      </div>

      <Wrapper id="limit-order-history">
        {limitOrderHistory
          .filter((limitOrderHist) => {
            if (openOrdersTabActive) {
              return limitOrderHist.isOrderOpen
            }
            return !limitOrderHist.isOrderOpen
          })
          .map((limitOrderHist) => {
            return <LimitOrderHistoryItem key={limitOrderHist.orderHash} item={limitOrderHist} />
          })}
      </Wrapper>
    </LimitOrderHistoryBody>
  )
}
