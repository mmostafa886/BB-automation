module.exports = {
  // Define your modules with specific test case IDs
  modules: [
    {
      name: 'Login',
      description: 'Authentication and login functionality',
      testCaseIds: [
        // Add your login test case IDs here
        3871,3874, 3877
      ]
    },
    {
      name: 'Navigation-Menu',
      description: 'Side navigation and menu tests',
      testCaseIds: [
        // Add your navigation test case IDs here
        3899,3903
      ]
    },
    {
      name: 'Library-Management',
      description: 'Library management module tests',
      testCaseIds: [
       4029,4037,4039,4040,4041,4218,4219,4220,4221,4222,4223,4224,4225,4226,4227,4228,4229,
       4235,4238,4239,4243,4244,4245,4246,4247,4248,4249,4250,4251,4252,4253,4254,
       4153,4155,4156,4158,4160,4161,4162,4164,4165,4166,4167,4168,4169,4170,4171,4172,4173,
       4174,4175,4176,4177,4178,4179,4180,4192,4193,4194,4197,4198,4199,4200,4209,4210,4211,4212,
       4213,4287,4288,4289,4757,4762,4315,4316,4324,4325,4326,4327,4328,4331,4332,4333,
       4336,4347,4349,4350,4355,4356,4365,4367,4376,4380,4385,4391,4397,4407,4412,4418,4443,4444,
       4426,4427,4433,4435,4602,4603,4678,4679,4685,4743,4745,4749,4751,4661,4668,4675,4806,4807,4809,
       4823,4824,4825,4826,4857,4863,4864,4875,4876,4877,4878,4879,4881,4882,4883,4884,4886,4888,4889,
       4890,4891,4892,4893,4899,4900,4901,4911,4898,4912,4917,4920,4922,4923,4925,4926,
       5021,5022,5034,5038,5040,5041,5044,5045,5029,5032,5033,5064,5065,5066,5067,5068,5069,5070,5071,
       5072,5072,5074,5075,5076,5077,5080,5081,5083,5084,5085,5087,5097,5099,5101,5102,5104,5110,5172,
       5112,5113,5117,5120,5125,5143,5145,5148,5149,5170,5171,5173,5174,5204,5205,5206,5207,
       5242,5243,5244,5248,5249
      ]
    },
    {
      name: 'Reaction-Templates',
      description: 'Reaction template management',
      testCaseIds: [
        4066,4068,4072,4074,4088,4089,4090,4093,5398,5399,5409,4045,4051,4053,4057,
        4059,4060,4062,4064,4585,4586,4587,4588,4590,4593,4594,4606
      ]
    },
    {
      name: 'Plate-Layouts',
      description: 'Plate layout configuration and management',
      testCaseIds: [
        3998,3999,4001, 5401, 5402, 5403,4013,4014,4016,4019,
        3978,3980,3982,4106,4117,4123
      ]
    },
    {
      name: 'Products',
      description: 'Product management and registration',
      testCaseIds: [
        4778,4779,4782,4783,4792,4793,4794,4795,4796
      ]
    },
    {
      name: 'Reagents',
      description: 'Controlled vocabularies and reagent management',
      testCaseIds: [
        3914,3915,3920,3922,3923,3930,3946,5405,5406,5407,5408,
        3955,3956,3957,3959,3966,3972,3973,3975,5282,5283,5286,5390,5391,
        6125,6126,6127,6128,6129,6130,6131, // Role Flag Update (US-5679)
        6148 // Boiling Point field validations
      ]
    },
    {
      name: 'Projects',
      description: 'Project management',
      testCaseIds: [
        4495,4496,4497,4503,4505,4506,4507,4517,4519,4520,5412
      ]
    },
    {
      name: 'Users',
      description: 'User management and role permissions',
      testCaseIds: [
        4264,4273
      ]
    },
    {
      name: 'Audit-Trail',
      description: 'Audit trail and data integrity',
      testCaseIds: [
        4559,4560,4562,4563,4564,5418,5419,5420,5421,5422
      ]
    },
    {
      name: 'Instruments',
      description: 'Instrument configuration and management',
      testCaseIds: [
        4961,4972,4974,4975,4985,4987,4990,4950,4952,4954,4955,5414,5424
      ]
    },
    {
      name: 'Sign-Out',
      description: 'Logout functionality',
      testCaseIds: [
        4257,4259,4260
      ]
    },
    {
      name: 'Instrument-Metadata-Update',
      description: 'Auto-added by ado-uss-to-tcs — 2026-04-01',
      testCaseIds: [
        6232,6233,6234,6235,6236,6237,6238,6239,6240,6241,6242,6243,6244,6245,6246,6247,6248,6249,6250,6251,6252,6253,6254,6255
      ]
    },
    {
      name: 'Upload-Reaction-CSV',
      description: 'Auto-added by ado-uss-to-tcs — 2026-05-04',
      testCaseIds: [
        6539,
        6540,
        6541,
        6542,
        6543,
        6544,
        6545,
        6546,
        6547,
        6548,
        6549,
        6550,
        6551,
        6552,
        6553,
        6554,
        6555,
        6556,
        6557,
        6558,
        6559,
        6560,
        6561,
        6562,
        6563,
        6564,
        6565,
        6566,
        6567,
        6568,
        6569,
        6570,
        6571,
        6572,
        6574,
        6577,
        6578
      ,
        6816,6817,6818,6819,6820,6821,6822,6823,6824,6825,6826,6827 // added by ado-uss-to-tcs
      ]
    },
    {
      name: 'Reaction-Setup-Viewer',
      description: 'Auto-added by ado-uss-to-tcs — 2026-05-05',
      testCaseIds: [
        6662,6663,6664,6665,6666,6667,6668,6669,6670,6671,6672,6673,6674,6675,6676,6677,6678,6679,6680,6681,6682,6683,6684,6685,6686,6687
      ,
        6840,6841,6842,6843,6844 // added by ado-uss-to-tcs
      ]
    },
    {
      name: 'Scale-Substrate-Config',
      description: 'Auto-added by ado-uss-to-tcs — 2026-05-05',
      testCaseIds: [
        6688,6689,6690,6691,6692,6693,6694,6695,6696,6697,6698,6699,6700,6701,6702,6703,6704,6705,6706,6707,6708,6709,6710,6711,6712,6713,6714,6715,6716
      ,
        6866,6867,6868,6869,6870,6871 // added by ado-uss-to-tcs
      ]
    },
    {
      name: 'Continue-Campaign-Wizard',
      description: 'Auto-added by ado-uss-to-tcs — 2026-05-11 (replaces former Edit-Campaign-Metadata module; old TCs deleted after US 6519 was repurposed)',
      testCaseIds: [
        6888,6889,6890,6891,6892,6893,6894,6895,6896,6897,6898,6899
      ]
    }
  ],

  // Specify which modules to generate (empty array = all modules)
  activeModules: [
    'Login',
    'Navigation-Menu',
    'Library-Management',
    'Reaction-Templates',
    'Plate-Layouts',
    'Products',
    'Reagents',
    'Projects',
    'Users',
    'Audit-Trail',
    'Instruments',
    'Sign-Out',
  'Instrument-Metadata-Update',
  'Upload-Reaction-CSV',
  
  'Reaction-Setup-Viewer',
  
  'Scale-Substrate-Config',

  'Continue-Campaign-Wizard',
  ],

  filterMode: 'modules'
};
