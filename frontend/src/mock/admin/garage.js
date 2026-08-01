export const garageResponse = {
  vehicles: [
    {
      id: 'veh_1',
      name: 'تويوتا كامري 2024',
      plateNumber: 'KSA 4432',
      addedDate: '02/01/2024',
      isActive: true,
      vin: '4T1BF1FK0NU623451',
      odometer: '85,000 كم',
      lastServiceDate: '12 أبريل',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuOg5iwDTsebAj4g5yu_4-c7f_DlDtuEe72REVfpuQOa_1vC1yuTiXW1s3IyRiPvX-TiF3ugnvNRXZvRa5LdcB_E16tgKvvKko_fDckrVT_qcH24Zi0Ci35cf9v8x_V1DKKbUKgi2yM2l7sPZWzagQIaFCQ9NyRyOZadkbS73WNN6JBJAgpJ4dmXIbiO5e4jPtZ-Lj_iNP2fom-aK6zllj6fFMoSTPyajVcdrG9iL01lN-2Sv4UBFZh4mHKLVJA4vf5tAaQEAx_Zs'
    },
    {
      id: 'veh_2',
      name: 'مرسيدس GLE 450',
      plateNumber: 'UAE 9901',
      addedDate: '15/11/2023',
      isActive: false,
      vin: 'W1N1671591A987654',
      odometer: '45,200 كم',
      lastServiceDate: '10 يناير',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8lwqonfg-MTu0v8fhHLdnYkoVVPM21NwTfQRoZOEtn9srwF6EALKPdSKveALgOoWdYSg8TYqNUJ_phj5PR46GiMBA0J8GZbrsqfN9TqD99xMNzfLJ8E_nzH6j1H1i8MEhqa3Gqqsk-C0ovlJORMas0pjRYaJccOf6cYBwU5iOyNQ5b-B7c0MzOAYdA9fSB43fwyvkJ6muxUYrr7gsRuTpWyT8YyTljsAHJ7NW4s_M3lhWzKgt2qn_JbvKoQhHGHIrcT55FGGa-0s'
    }
  ],
  serviceTypes: [
    'نوع الخدمة (الكل)',
    'صيانة دورية',
    'إصلاح ميكانيكي',
    'كهرباء'
  ],
  years: [
    'السنة (الكل)',
    '2026',
    '2025',
    '2024'
  ],
  historyNodes: [
    {
      id: 'node_1',
      vehicleId: 'veh_1',
      title: 'صيانة 80,000 كم',
      serviceType: 'صيانة دورية',
      year: '2026',
      date: '12 أبريل 2026',
      technician: 'م. محمد علي',
      cost: 650,
      status: 'completed',
      statusLabel: 'مكتمل',
      hasInvoice: true
    },
    {
      id: 'node_2',
      vehicleId: 'veh_1',
      title: 'استبدال فحمات وزيت',
      serviceType: 'إصلاح ميكانيكي',
      year: '2026',
      date: '10 يناير 2026',
      technician: 'م. فهد سالم',
      cost: 420,
      partsTitle: 'القطع المرفقة:',
      partsPhotos: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBGGaJmY5QeHIm-NS0GgWp8DL79Jl1HIfnWjUOnvXrWsPAMf1DkH1fsH_acNhbuFBoW6Dx5aXligSgaNS8OUemE6YGSrSnbsxba1u80eSZCw99WGnE9irAHG7XuhM9wzGAhjJSR8DxBq7Hjr1Pou4eC-gK_F8FSosGR4KCOx_Tzsl9A4AB6bE51rt-sHTNhHi1GJ0Q5A_Wpj1htyqDhMTyGetXTcEpu6P0zfvgBkqWjqk2qjjW1X9hoSihdt0yK4omzilIHWJWYs8M',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCckXiqnAhHomEUO5mLr6zURumQD7YWCJd5LJNiPZDiYAJdlih_xzgnuCnhncJmypfOYgaja4kQ_-t2VoklzYFR9PxLqY--NwABDiiWQSwpiIWTsu1lowjJj0DHpg3S2uhsDzHchAG-UOmxakVpCAvXcqIdP6ig3ajD5Cia-JR7f-EeswJB3b6ZGPbl5PbJFYVQ9GBTP3cFLx2dbRBwxgEhZSf3wu9EAMqQc1ELOMIYDJHiHzcE2yqjs8g6OSafj_JobfaKMFcpkYI'
      ],
      extraPartsCount: 3
    }
  ]
};
