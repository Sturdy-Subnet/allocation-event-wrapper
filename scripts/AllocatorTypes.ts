/* eslint-disable camelcase */
import { BigNumberish } from "ethers";

export interface MinerAllocation extends Object {
  uid: number;
  rank: number;
  allocations: { [key: string]: number }; // Assuming the allocations object is a dictionary with number values
}

export interface SturdySubnetResponse extends Object {
  // eslint-disable-next-line camelcase
  request_uuid: string;
  allocations: {
    [key: number]: MinerAllocation;
  };
}

export interface PoolEntry extends Object {
  pool_model_disc: string
  pool_type: string;
  contract_address: string;
  pool_data_provider_type: string;
}

export interface Pools {
  [key: string]: PoolEntry;
}

export interface RequestData extends Object {
  request_type: string;
  user_address?: string;
  num_allocs?: number;
  pool_data_provider_type?: string;
  assets_and_pools: {
    total_assets: BigNumberish;
    pools: Pools;
    user_address?: string;
  };
}
