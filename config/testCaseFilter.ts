export interface TestModule {
  name: string;
  description: string;
  testCaseIds: string[];
}

export interface TestCaseFilterConfig {
  modules: TestModule[];
  activeModules: string[];
  filterMode: string;
}

const testCaseFilter: TestCaseFilterConfig = {
  modules: [
    {
      name: 'Login',
      description: 'Authentication and login functionality',
      testCaseIds: ['BB-3871', 'BB-3874', 'BB-3877'],
    },
    {
      name: 'Navigation-Menu',
      description: 'Side navigation and menu tests',
      testCaseIds: ['BB-3899', 'BB-3903'],
    },
    {
      name: 'Library-Management',
      description: 'Library management module tests',
      testCaseIds: [
        'BB-4029', 'BB-4037', 'BB-4039', 'BB-4040', 'BB-4041', 'BB-4218', 'BB-4219', 'BB-4220', 'BB-4221', 'BB-4222', 'BB-4223', 'BB-4224', 'BB-4225', 'BB-4226', 'BB-4227', 'BB-4228', 'BB-4229',
        'BB-4235', 'BB-4238', 'BB-4239', 'BB-4243', 'BB-4244', 'BB-4245', 'BB-4246', 'BB-4247', 'BB-4248', 'BB-4249', 'BB-4250', 'BB-4251', 'BB-4252', 'BB-4253', 'BB-4254',
        'BB-4153', 'BB-4155', 'BB-4156', 'BB-4158', 'BB-4160', 'BB-4161', 'BB-4162', 'BB-4164', 'BB-4165', 'BB-4166', 'BB-4167', 'BB-4168', 'BB-4169', 'BB-4170', 'BB-4171', 'BB-4172', 'BB-4173',
        'BB-4174', 'BB-4175', 'BB-4176', 'BB-4177', 'BB-4178', 'BB-4179', 'BB-4180', 'BB-4192', 'BB-4193', 'BB-4194', 'BB-4197', 'BB-4198', 'BB-4199', 'BB-4200', 'BB-4209', 'BB-4210', 'BB-4211', 'BB-4212',
        'BB-4213', 'BB-4287', 'BB-4288', 'BB-4289', 'BB-4757', 'BB-4762', 'BB-4315', 'BB-4316', 'BB-4324', 'BB-4325', 'BB-4326', 'BB-4327', 'BB-4328', 'BB-4331', 'BB-4332', 'BB-4333',
        'BB-4336', 'BB-4347', 'BB-4349', 'BB-4350', 'BB-4355', 'BB-4356', 'BB-4365', 'BB-4367', 'BB-4376', 'BB-4380', 'BB-4385', 'BB-4391', 'BB-4397', 'BB-4407', 'BB-4412', 'BB-4418', 'BB-4443', 'BB-4444',
        'BB-4426', 'BB-4427', 'BB-4433', 'BB-4435', 'BB-4602', 'BB-4603', 'BB-4678', 'BB-4679', 'BB-4685', 'BB-4743', 'BB-4745', 'BB-4749', 'BB-4751', 'BB-4661', 'BB-4668', 'BB-4675', 'BB-4806', 'BB-4807', 'BB-4809',
        'BB-4823', 'BB-4824', 'BB-4825', 'BB-4826', 'BB-4857', 'BB-4863', 'BB-4864', 'BB-4875', 'BB-4876', 'BB-4877', 'BB-4878', 'BB-4879', 'BB-4881', 'BB-4882', 'BB-4883', 'BB-4884', 'BB-4886', 'BB-4888', 'BB-4889',
        'BB-4890', 'BB-4891', 'BB-4892', 'BB-4893', 'BB-4899', 'BB-4900', 'BB-4901', 'BB-4911', 'BB-4898', 'BB-4912', 'BB-4917', 'BB-4920', 'BB-4922', 'BB-4923', 'BB-4925', 'BB-4926',
        'BB-5021', 'BB-5022', 'BB-5034', 'BB-5038', 'BB-5040', 'BB-5041', 'BB-5044', 'BB-5045', 'BB-5029', 'BB-5032', 'BB-5033', 'BB-5064', 'BB-5065', 'BB-5066', 'BB-5067', 'BB-5068', 'BB-5069', 'BB-5070', 'BB-5071',
        'BB-5072', 'BB-5074', 'BB-5075', 'BB-5076', 'BB-5077', 'BB-5080', 'BB-5081', 'BB-5083', 'BB-5084', 'BB-5085', 'BB-5087', 'BB-5097', 'BB-5099', 'BB-5101', 'BB-5102', 'BB-5104', 'BB-5110', 'BB-5172',
        'BB-5112', 'BB-5113', 'BB-5117', 'BB-5120', 'BB-5125', 'BB-5143', 'BB-5145', 'BB-5148', 'BB-5149', 'BB-5170', 'BB-5171', 'BB-5173', 'BB-5174', 'BB-5204', 'BB-5205', 'BB-5206', 'BB-5207',
        'BB-5242', 'BB-5243', 'BB-5244', 'BB-5248', 'BB-5249',
      ],
    },
    {
      name: 'Reaction-Templates',
      description: 'Reaction template management',
      testCaseIds: [
        'BB-4066', 'BB-4068', 'BB-4072', 'BB-4074', 'BB-4088', 'BB-4089', 'BB-4090', 'BB-4093', 'BB-5398', 'BB-5399', 'BB-5409', 'BB-4045', 'BB-4051', 'BB-4053', 'BB-4057',
        'BB-4059', 'BB-4060', 'BB-4062', 'BB-4064', 'BB-4585', 'BB-4586', 'BB-4587', 'BB-4588', 'BB-4590', 'BB-4593', 'BB-4594', 'BB-4606',
      ],
    },
    {
      name: 'Plate-Layouts',
      description: 'Plate layout configuration and management',
      testCaseIds: [
        'BB-3998', 'BB-3999', 'BB-4001', 'BB-5401', 'BB-5402', 'BB-5403', 'BB-4013', 'BB-4014', 'BB-4016', 'BB-4019',
        'BB-3978', 'BB-3980', 'BB-3982', 'BB-4106', 'BB-4117', 'BB-4123',
      ],
    },
    {
      name: 'Products',
      description: 'Product management and registration',
      testCaseIds: ['BB-4778', 'BB-4779', 'BB-4782', 'BB-4783', 'BB-4792', 'BB-4793', 'BB-4794', 'BB-4795', 'BB-4796'],
    },
    {
      name: 'Reagents',
      description: 'Controlled vocabularies and reagent management',
      testCaseIds: [
        'BB-3914', 'BB-3915', 'BB-3920', 'BB-3922', 'BB-3923', 'BB-3930', 'BB-3946', 'BB-5405', 'BB-5406', 'BB-5407', 'BB-5408',
        'BB-3955', 'BB-3956', 'BB-3957', 'BB-3959', 'BB-3966', 'BB-3972', 'BB-3973', 'BB-3975', 'BB-5282', 'BB-5283', 'BB-5286', 'BB-5390', 'BB-5391',
        'BB-6125', 'BB-6126', 'BB-6127', 'BB-6128', 'BB-6129', 'BB-6130', 'BB-6131',
        'BB-6148',
      ],
    },
    {
      name: 'Projects',
      description: 'Project management',
      testCaseIds: ['BB-4495', 'BB-4496', 'BB-4497', 'BB-4503', 'BB-4505', 'BB-4506', 'BB-4507', 'BB-4517', 'BB-4519', 'BB-4520', 'BB-5412'],
    },
    {
      name: 'Users',
      description: 'User management and role permissions',
      testCaseIds: ['BB-4264', 'BB-4273'],
    },
    {
      name: 'Audit-Trail',
      description: 'Audit trail and data integrity',
      testCaseIds: ['BB-4559', 'BB-4560', 'BB-4562', 'BB-4563', 'BB-4564', 'BB-5418', 'BB-5419', 'BB-5420', 'BB-5421', 'BB-5422'],
    },
    {
      name: 'Instruments',
      description: 'Instrument configuration and management',
      testCaseIds: ['BB-4961', 'BB-4972', 'BB-4974', 'BB-4975', 'BB-4985', 'BB-4987', 'BB-4990', 'BB-4950', 'BB-4952', 'BB-4954', 'BB-4955', 'BB-5414', 'BB-5424'],
    },
    {
      name: 'Sign-Out',
      description: 'Logout functionality',
      testCaseIds: ['BB-4257', 'BB-4259', 'BB-4260'],
    },
    {
      name: 'Instrument-Metadata-Update',
      description: 'Auto-added by jira-uss-to-tcs — 2026-04-01',
      testCaseIds: [
        'BB-6232', 'BB-6233', 'BB-6234', 'BB-6235', 'BB-6236', 'BB-6237', 'BB-6238', 'BB-6239', 'BB-6240', 'BB-6241', 'BB-6242', 'BB-6243', 'BB-6244', 'BB-6245', 'BB-6246', 'BB-6247', 'BB-6248', 'BB-6249', 'BB-6250', 'BB-6251', 'BB-6252', 'BB-6253', 'BB-6254', 'BB-6255',
      ],
    },
    {
      name: 'Upload-Reaction-CSV',
      description: 'Auto-added by jira-uss-to-tcs — 2026-05-04',
      testCaseIds: [
        'BB-6539', 'BB-6540', 'BB-6541', 'BB-6542', 'BB-6543', 'BB-6544', 'BB-6545', 'BB-6546', 'BB-6547', 'BB-6548', 'BB-6549', 'BB-6550', 'BB-6551', 'BB-6552', 'BB-6553', 'BB-6554',
        'BB-6555', 'BB-6556', 'BB-6557', 'BB-6558', 'BB-6559', 'BB-6560', 'BB-6561', 'BB-6562', 'BB-6563', 'BB-6564', 'BB-6565', 'BB-6566', 'BB-6567', 'BB-6568', 'BB-6569', 'BB-6570',
        'BB-6571', 'BB-6572', 'BB-6574', 'BB-6577', 'BB-6578',
        'BB-6816', 'BB-6817', 'BB-6818', 'BB-6819', 'BB-6820', 'BB-6821', 'BB-6822', 'BB-6823', 'BB-6824', 'BB-6825', 'BB-6826', 'BB-6827',
      ],
    },
    {
      name: 'Reaction-Setup-Viewer',
      description: 'Auto-added by jira-uss-to-tcs — 2026-05-05',
      testCaseIds: [
        'BB-6662', 'BB-6663', 'BB-6664', 'BB-6665', 'BB-6666', 'BB-6667', 'BB-6668', 'BB-6669', 'BB-6670', 'BB-6671', 'BB-6672', 'BB-6673', 'BB-6674', 'BB-6675', 'BB-6676', 'BB-6677',
        'BB-6678', 'BB-6679', 'BB-6680', 'BB-6681', 'BB-6682', 'BB-6683', 'BB-6684', 'BB-6685', 'BB-6686', 'BB-6687',
        'BB-6840', 'BB-6841', 'BB-6842', 'BB-6843', 'BB-6844',
      ],
    },
    {
      name: 'Scale-Substrate-Config',
      description: 'Auto-added by jira-uss-to-tcs — 2026-05-05',
      testCaseIds: [
        'BB-6688', 'BB-6689', 'BB-6690', 'BB-6691', 'BB-6692', 'BB-6693', 'BB-6694', 'BB-6695', 'BB-6696', 'BB-6697', 'BB-6698', 'BB-6699', 'BB-6700', 'BB-6701', 'BB-6702', 'BB-6703',
        'BB-6704', 'BB-6705', 'BB-6706', 'BB-6707', 'BB-6708', 'BB-6709', 'BB-6710', 'BB-6711', 'BB-6712', 'BB-6713', 'BB-6714', 'BB-6715', 'BB-6716',
        'BB-6866', 'BB-6867', 'BB-6868', 'BB-6869', 'BB-6870', 'BB-6871',
      ],
    },
    {
      name: 'Continue-Campaign-Wizard',
      description: 'Auto-added by jira-uss-to-tcs — 2026-05-11 (replaces former Edit-Campaign-Metadata module; old TCs deleted after US BB-6519 was repurposed)',
      testCaseIds: ['BB-6888', 'BB-6889', 'BB-6890', 'BB-6891', 'BB-6892', 'BB-6893', 'BB-6894', 'BB-6895', 'BB-6896', 'BB-6897', 'BB-6898', 'BB-6899'],
    },
  ],

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

  filterMode: 'modules',
};

export default testCaseFilter;
