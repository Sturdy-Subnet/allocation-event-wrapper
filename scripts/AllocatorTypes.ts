import { BigNumberish } from "ethers";

export interface Allocation extends Object {
  uid: string;
  apy: number;
  allocations: { [key: string]: number }; // Assuming the allocations object is a dictionary with number values
}

export interface SturdySubnetResponse extends Object {
  // eslint-disable-next-line camelcase
  request_uuid: string;
  allocations: {
    [key: string]: Allocation;
  };
}

export interface PoolEntry extends Object {
  pool_model_disc: string;
  pool_type: string;
  pool_id: string;
  contract_address: string;
}

export interface Pools {
  [key: string]: PoolEntry;
}

export interface RequestData extends Object {
  request_type: string;
  user_address?: string;
  assets_and_pools: {
    total_assets: BigNumberish;
    pools: Pools;
    user_address?: string;
  }
}
