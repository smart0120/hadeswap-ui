import { FC, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { PairType } from 'hadeswap-sdk/lib/hadeswap-core/types';
import { Spinner } from '../../../components/Spinner/Spinner';
import TransactionsWarning from '../../../components/TransactionsWarning';
import { PriceBlock } from '../../../components/PoolSettings/PriceBlock';
import { AssetsBlock } from '../../../components/PoolSettings/AssetsBlock';
import { usePoolServicePrice } from '../../../components/PoolSettings/hooks/usePoolServicePrice';
import { usePoolServiceAssets } from '../../../components/PoolSettings/hooks/usePoolServiceAssets';
import { useAssetsSetHeight } from '../../../components/PoolSettings/hooks/useAssetsSetHeight';
import usePriceGraph from '../../../components/Chart/hooks/usePriceGraph';
import Button from '../../../components/Buttons/Button';
import Chart from '../../../components/Chart/Chart';
import { useCreatePool } from '../hooks';
import { useFetchAllMarkets } from '../../../requests';
import {
  selectAllMarkets,
  selectAllMarketsLoading,
} from '../../../state/core/selectors';
import { chartIDs } from '../../../components/Chart/constants';
import { getRawDelta, getRawSpotPrice } from '../../../utils';
import styles from './styles.module.scss';

interface StepThreeProps {
  pairType: PairType;
  chosenMarketKey: string;
}

const SIGN_TXN_TIMEOUT = 5000;

export const StepThree: FC<StepThreeProps> = ({
  pairType,
  chosenMarketKey,
}) => {
  useFetchAllMarkets();
  const history = useHistory();
  const markets = useSelector(selectAllMarkets);
  const marketsLoading = useSelector(selectAllMarketsLoading);

  const [isSupportSignAllTxns, setIsSupportSignAllTxns] =
    useState<boolean>(true);

  const chosenMarket = markets.find(
    (market) => market.marketPubkey === chosenMarketKey,
  );

  const {
    nfts,
    selectedNfts,
    toggleNft,
    selectAll,
    deselectAll,
    nftsLoading,
    formAssets,
    buyOrdersAmount = 0,
  } = usePoolServiceAssets({ marketPublicKey: chosenMarketKey });

  const { formValue, setFormValue } = usePoolServicePrice({});

  const initialValuesAssets = useMemo(
    () => ({
      buyOrdersAmount: 0,
    }),
    [],
  );

  const rawDelta = getRawDelta({
    delta: formValue.delta,
    curveType: formValue.curveType,
    buyOrdersAmount,
    nftsAmount: selectedNfts.length,
    mathCounter: 0,
  });

  const rawSpotPrice = getRawSpotPrice({
    rawDelta,
    spotPrice: formValue.spotPrice,
    curveType: formValue.curveType,
    mathCounter: 0,
  });

  const rawFee = formValue.fee * 100;

  const isCreateButtonDisabled =
    (pairType !== PairType.TokenForNFT && !selectedNfts.length) ||
    (pairType === PairType.TokenForNFT && !buyOrdersAmount) ||
    !formValue.spotPrice;

  const creationSpotPrice = Math.ceil(formValue.spotPrice * 1e9);

  const { create: onCreatePoolClick } = useCreatePool({
    pairType,
    buyOrdersAmount,
    marketPubkey: chosenMarketKey,
    selectedNfts,
    curveType: formValue.curveType,
    rawSpotPrice: creationSpotPrice,
    rawDelta: rawDelta,
    rawFee,
    isSupportSignAllTxns,
    onAfterTxn: () => history.push('/my-pools'),
    signTimeout: SIGN_TXN_TIMEOUT,
  });

  const chartData = usePriceGraph({
    baseSpotPrice: rawSpotPrice,
    rawDelta: rawDelta,
    rawFee,
    bondingCurve: formValue.curveType,
    buyOrdersAmount,
    nftsCount: selectedNfts?.length,
    type: pairType,
  });

  const { assetsBlockRef, priceBlockRef } = useAssetsSetHeight(pairType);

  const isLoading = marketsLoading || nftsLoading;

  return (
    <div className={styles.settingsBlockWrapper}>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className={styles.settingsBlock}>
            <PriceBlock
              ref={priceBlockRef}
              formValue={formValue}
              setFormValue={setFormValue}
              pairType={pairType}
              chosenMarket={chosenMarket}
              buyOrdersAmount={buyOrdersAmount}
              nftsCount={selectedNfts.length}
              rawDelta={rawDelta}
            />
            <AssetsBlock
              ref={assetsBlockRef}
              nfts={nfts}
              toggleNft={toggleNft}
              selectedNfts={selectedNfts}
              pairType={pairType}
              form={formAssets}
              selectAll={selectAll}
              deselectAll={deselectAll}
              formInitialValues={initialValuesAssets}
            />
          </div>

          {!!chartData?.length && (
            <Chart
              title="price graph"
              data={chartData}
              chartID={chartIDs.priceGraph}
            />
          )}

          <div className={styles.settingsButtonsWrapper}>
            {pairType === PairType.TokenForNFT ? (
              <Button
                isDisabled={isCreateButtonDisabled}
                onClick={onCreatePoolClick}
              >
                <span>create pool</span>
              </Button>
            ) : (
              <TransactionsWarning
                checked={!isSupportSignAllTxns}
                onChange={() => setIsSupportSignAllTxns(!isSupportSignAllTxns)}
                onClick={onCreatePoolClick}
                isDisabled={isCreateButtonDisabled}
                buttonText="create pool"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
