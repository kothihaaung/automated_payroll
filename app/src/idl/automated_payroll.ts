/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/automated_payroll.json`.
 */
export type AutomatedPayroll = {
  "address": "FhyRNpsvvtY3HB1jtubTAJnWwkPrhWysHAcKS3SekXZs",
  "metadata": {
    "name": "automatedPayroll",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addEmployee",
      "discriminator": [
        14,
        82,
        239,
        156,
        50,
        90,
        189,
        61
      ],
      "accounts": [
        {
          "name": "employer",
          "writable": true,
          "signer": true
        },
        {
          "name": "employeeWallet"
        },
        {
          "name": "employeePda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  112,
                  108,
                  111,
                  121,
                  101,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              },
              {
                "kind": "account",
                "path": "employeeWallet"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "salary",
          "type": "u64"
        },
        {
          "name": "interval",
          "type": "i64"
        }
      ]
    },
    {
      "name": "disbursePayment",
      "discriminator": [
        62,
        42,
        214,
        246,
        25,
        33,
        214,
        93
      ],
      "accounts": [
        {
          "name": "employeePda",
          "writable": true
        },
        {
          "name": "vaultPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              }
            ]
          }
        },
        {
          "name": "employeeWallet",
          "writable": true
        },
        {
          "name": "employer",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializePayroll",
      "discriminator": [
        167,
        26,
        70,
        176,
        167,
        66,
        216,
        138
      ],
      "accounts": [
        {
          "name": "employer",
          "writable": true,
          "signer": true
        },
        {
          "name": "payrollConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  114,
                  111,
                  108,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              }
            ]
          }
        },
        {
          "name": "vaultPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "employer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "totalBudget",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "employee",
      "discriminator": [
        98,
        238,
        61,
        252,
        130,
        77,
        105,
        67
      ]
    },
    {
      "name": "payrollConfig",
      "discriminator": [
        126,
        142,
        7,
        211,
        33,
        33,
        103,
        211
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "customError",
      "msg": "Custom error message"
    },
    {
      "code": 6001,
      "name": "paymentNotDue",
      "msg": "The payment is not due yet."
    }
  ],
  "types": [
    {
      "name": "employee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "employer",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "salary",
            "type": "u64"
          },
          {
            "name": "lastPaid",
            "type": "i64"
          },
          {
            "name": "interval",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "payrollConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "employer",
            "type": "pubkey"
          },
          {
            "name": "totalBudget",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
