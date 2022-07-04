let p = [
    'Alvarado Florian',    'Armstrong, David ',
    'Bailey, Jonah',      'Baker, Gracie ',
    'Blodgett, Tommy',     'Davis, Emily',
    'Gilchrist, Isabelle ',  'Graham, Carter',
    'Heaton, Kyle',         'Holtsclaw, Chris ',
    'Johnson, Chris',     'Love, Henry',
    'Magers, Steven',      'Mepham, Kerri',
    'Miller, Nathaniel',    'Nambiar, Anika',
    'Parton, Celia',        'Perez, Brandon',
    'Riley, Sean',           'Soller, Claire',
    'Sponhauer, Carrie',   'Summers, Nathan',
    'Talbert, Justine',      'Tsan, Ansen',
    'Venkateswaran, Ashwin', 'Vigants, Lukas',
    'Zamora, Elias',         'Zeevaart, Luke'
]

while(p.length > 0){
    console.log(p.splice(Math.floor(Math.random()*p.length),1)[0])
}